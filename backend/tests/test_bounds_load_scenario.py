from scripts.bounds_benchmark_cases import BOUNDS_CASES, bounds_case_at


def test_four_workers_partition_all_bounds_cases_without_overlap():
    selected_cases = [
        tuple(bounds_case_at(sequence, worker_index, worker_count=4).items())
        for worker_index in range(4)
        for sequence in range(len(BOUNDS_CASES) // 4)
    ]

    assert len(selected_cases) == len(BOUNDS_CASES)
    assert len(set(selected_cases)) == len(BOUNDS_CASES)


def test_bounds_case_sequence_wraps_after_one_full_cycle():
    assert bounds_case_at(len(BOUNDS_CASES), worker_index=0, worker_count=1) == BOUNDS_CASES[0]
