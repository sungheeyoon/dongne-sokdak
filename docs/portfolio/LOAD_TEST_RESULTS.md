# 부하 테스트 결과 — 2026.05.11

← [Engineering Notes로 돌아가기](./ENGINEERING_NOTES.md)

> ENGINEERING_NOTES §1에서 PostGIS RPC(V3)와 REST + Haversine(V1)의 트래픽 부하 차이를 정량화하기 위한 측정. **1차에서 셋업 한계로 큐잉 병목에 가려졌고, 환경을 교정한 2차 재측정에서 가설이 검증**됐다. 이 과정 자체가 기록 대상.

---

## 측정 1차 (v1)

### 셋업

- **백엔드**: FastAPI + `uvicorn --reload` (단일 워커, 로컬)
- **DB**: Supabase 클라우드 (PostgreSQL + PostGIS)
- **시드 데이터**: `backend/scripts/generate_dummy.py`로 10,000건 (80%가 강남역 반경 1km 집중)
- **클라이언트**: Locust headless, **50 users / spawn-rate 10/s / 3분**
- **시나리오 A (메인)**: `/nearby (Gangnam)` 가중치 3 + `/nearby (Random Seoul)` 가중치 1 + `/bounds` 가중치 1
- **시나리오 B (벤치마크)**: `/benchmark/nearby-rest` (V1) vs `/nearby` (V3) 1:1

원본: `backend/results/locust/{main,benchmark}_stats.csv`

### 결과

**메인**

| 엔드포인트 | 요청 | p50 | p95 | p99 | RPS | 실패 |
|---|---:|---:|---:|---:|---:|---:|
| GET /nearby (Gangnam Hotspot) | 236 | 20.0s | 25s | 27s | 1.33 | 0 |
| GET /nearby (Random Seoul) | 78 | 20.0s | 26s | 27s | 0.44 | 0 |
| GET /bounds (Random Box) | 76 | 20.0s | 26s | 27s | 0.43 | 0 |
| **Aggregated** | **390** | **20.0s** | **26s** | **27s** | **2.21** | **0%** |

**벤치마크 V1 vs V3**

| 시나리오 | 요청 | p50 | p95 | p99 | RPS |
|---|---:|---:|---:|---:|---:|
| [V1] REST + Python Haversine | 168 | 25.0s | 30s | 31s | 0.97 |
| [V3] Fast RPC (Index Scan) | 152 | 25.0s | 29s | 31s | 0.88 |

### 해석

- **실패율 0%** — 50 동시 사용자에서 5xx/timeout 없음. 안정성은 확보.
- **V1 vs V3 차이 미검증** — p95 1초, p99 동률. 의도했던 "RPC가 명확히 빠르다"가 드러나지 않음.
- 원인: 모든 엔드포인트가 p50 ≈ 20~25s에 평준화됨 → **응답 시간 대부분이 큐 대기**. 단일 워커가 동시 요청을 직렬 처리하는 동안 실제 DB 쿼리 시간 차이(ms 단위)가 큐잉 지연(초 단위)에 가려졌다.

> 부하 테스트는 "내가 측정하려던 것"이 아니라 "환경에서 가장 좁은 병목"을 드러낸다.

→ 즉 이 환경에선 V1/V3 비교 자체가 무의미. 셋업을 바꿔서 재측정해야 한다는 진단.

---

## 측정 2차 (v2) — 셋업 교정 후 재측정

### 셋업 변경

- 백엔드를 **`uvicorn app.main:app --workers 4`**로 전환 (reload 제거)
- Locust 동시 사용자를 **20명**(spawn-rate 5/s)으로 줄여 *워커 풀(4) > 사용자 동시 요청 수* 조건 확보
- 나머지(시드 데이터, 시나리오, 시간 3분)는 그대로

원본: `backend/results/locust/{main_v2,benchmark_v2}_stats.csv`

### 결과

**메인**

| 엔드포인트 | 요청 | p50 | p95 | p99 | RPS | 실패 |
|---|---:|---:|---:|---:|---:|---:|
| GET /nearby (Gangnam Hotspot) | 752 | 680ms | 1.8s | 2.4s | 4.21 | 0 |
| GET /nearby (Random Seoul) | 251 | 630ms | 1.7s | 2.0s | 1.41 | 0 |
| GET /bounds (Random Box) | 237 | 770ms | 2.0s | 2.5s | 1.33 | 0 |
| **Aggregated** | **1,240** | **680ms** | **1.8s** | **2.3s** | **6.95** | **0%** |

**벤치마크 V1 vs V3**

| 시나리오 | 요청 | p50 | p95 | p99 | RPS |
|---|---:|---:|---:|---:|---:|
| [V1] REST + Python Haversine | 469 | 1,500ms | 3.3s | 4.3s | 2.62 |
| [V3] Fast RPC (Index Scan) | 540 | **1,100ms** | 3.2s | **3.9s** | **3.02** |
| **차이 (V3 vs V1)** | — | **−27%** | −3% | **−9%** | **+15%** |

### v1 → v2 비교 (셋업 교정 효과)

| 지표 | v1 | v2 | 개선 |
|---|---:|---:|---:|
| Aggregated p50 | 20,000ms | 680ms | **약 29×** |
| Aggregated RPS | 2.21 | 6.95 | **+214%** |
| V1 vs V3 p50 격차 | ≈ 0 (큐잉에 묻힘) | **400ms (V3 우세)** | — |
| 실패율 | 0% | 0% | 일관 유지 |

### 해석

**검증된 것**
- **V3 (PostGIS RPC)가 V1 (REST + Haversine) 대비 일관되게 빠름**:
  - p50 −27% (1,500ms → 1,100ms) — 가장 분명한 차이
  - p99 −9%, RPS +15% (처리량 우위)
  - max 응답 시간도 V3가 작음 (4.7s → 4.2s)
- **셋업 가설이 맞았다** — 단일 워커 큐잉이 진짜 DB 차이를 덮고 있었다는 진단이 v2에서 입증됨.
- **안정성 일관** — 워커를 늘려도 실패율 0% 유지.

**여전히 남는 것**
- 절대 응답 시간이 무겁다 (p50 ≈ 1s, Min ≈ 270~390ms). 이건 **Supabase 클라우드 네트워크 RTT**가 베이스라인일 가능성이 큼 — 백엔드/DB가 다른 리전에 있는 한 줄이기 어렵다.

---

## 다음 셋업

이번 측정의 한계를 더 줄이려면:

1. **DB 호출 구간 분리 계측** — 백엔드 응답 시간 안에서 DB 호출만 따로 (미들웨어 타이밍, `pg_stat_statements`) → 네트워크 RTT를 분리해서 RPC 자체의 쿼리 시간을 본다.
2. **같은 리전 배포** 또는 **로컬 PostgreSQL + PostGIS** — 클라우드 RTT를 제거한 환경에서 V1/V3 차이를 다시 측정.
3. **실사용자 트래픽 패턴** — 시나리오 기반 부하의 분포 가정에서 벗어나, 배포 후 실제 사용자 분포로 재검증.
