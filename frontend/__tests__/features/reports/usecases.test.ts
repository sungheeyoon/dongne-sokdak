import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ReportUseCases,
  ReportMutateUseCases,
  ImageUseCases,
  CommentUseCases,
  VoteUseCases
} from '@/features/reports/domain/usecases'

describe('Domain UseCases', () => {
  describe('ReportUseCases', () => {
    const mockRepo = {
      getReports: vi.fn(),
      getReportsInBounds: vi.fn(),
      getReportById: vi.fn(),
      getMyNeighborhoodReports: vi.fn(),
      createReport: vi.fn(),
      updateReport: vi.fn(),
      deleteReport: vi.fn()
    }

    let useCases: ReportUseCases

    beforeEach(() => {
      vi.clearAllMocks()
      useCases = new ReportUseCases(mockRepo as any)
    })

    it('getReports', async () => {
      mockRepo.getReports.mockResolvedValue('paginated')
      expect(await useCases.getReports({})).toBe('paginated')
      expect(mockRepo.getReports).toHaveBeenCalledWith({})
    })

    it('getReportsInBounds', async () => {
      mockRepo.getReportsInBounds.mockResolvedValue('bounded')
      const params = { north: 1, south: 0, east: 1, west: 0 }
      expect(await useCases.getReportsInBounds(params)).toBe('bounded')
      expect(mockRepo.getReportsInBounds).toHaveBeenCalledWith(params)
    })

    it('getReportById', async () => {
      mockRepo.getReportById.mockResolvedValue('report1')
      expect(await useCases.getReportById('1')).toBe('report1')
      expect(mockRepo.getReportById).toHaveBeenCalledWith('1')
    })

    it('getMyNeighborhoodReports', async () => {
      mockRepo.getMyNeighborhoodReports.mockResolvedValue('neighborhood')
      expect(await useCases.getMyNeighborhoodReports(5, 'c', 1, 10)).toBe('neighborhood')
      expect(mockRepo.getMyNeighborhoodReports).toHaveBeenCalledWith(5, 'c', 1, 10)
    })
  })

  describe('ReportMutateUseCases', () => {
    const mockRepo = {
      getReports: vi.fn(),
      getReportsInBounds: vi.fn(),
      getReportById: vi.fn(),
      getMyNeighborhoodReports: vi.fn(),
      createReport: vi.fn(),
      updateReport: vi.fn(),
      deleteReport: vi.fn()
    }

    let useCases: ReportMutateUseCases

    beforeEach(() => {
      vi.clearAllMocks()
      useCases = new ReportMutateUseCases(mockRepo as any)
    })

    it('createReport', async () => {
      mockRepo.createReport.mockResolvedValue('created')
      expect(await useCases.createReport({ data: 1 })).toBe('created')
      expect(mockRepo.createReport).toHaveBeenCalledWith({ data: 1 })
    })

    it('updateReport', async () => {
      mockRepo.updateReport.mockResolvedValue('updated')
      expect(await useCases.updateReport('1', { data: 2 })).toBe('updated')
      expect(mockRepo.updateReport).toHaveBeenCalledWith('1', { data: 2 })
    })

    it('deleteReport', async () => {
      mockRepo.deleteReport.mockResolvedValue(undefined)
      await useCases.deleteReport('1')
      expect(mockRepo.deleteReport).toHaveBeenCalledWith('1')
    })
  })

  describe('ImageUseCases', () => {
    const mockRepo = {
      uploadImage: vi.fn()
    }

    let useCases: ImageUseCases

    beforeEach(() => {
      vi.clearAllMocks()
      useCases = new ImageUseCases(mockRepo as any)
    })

    it('uploadImage', async () => {
      mockRepo.uploadImage.mockResolvedValue('url')
      const file = new File([''], 'test.png')
      expect(await useCases.uploadImage(file)).toBe('url')
      expect(mockRepo.uploadImage).toHaveBeenCalledWith(file)
    })
  })

  describe('CommentUseCases', () => {
    const mockRepo = {
      createComment: vi.fn(),
      updateComment: vi.fn(),
      getCommentsByReportId: vi.fn(),
      deleteComment: vi.fn()
    }

    let useCases: CommentUseCases

    beforeEach(() => {
      vi.clearAllMocks()
      useCases = new CommentUseCases(mockRepo as any)
    })

    it('createComment', async () => {
      mockRepo.createComment.mockResolvedValue('c-created')
      const data = { reportId: '1', content: 'test' }
      expect(await useCases.createComment(data)).toBe('c-created')
      expect(mockRepo.createComment).toHaveBeenCalledWith(data)
    })

    it('updateComment', async () => {
      mockRepo.updateComment.mockResolvedValue('c-updated')
      expect(await useCases.updateComment('1', { content: 'test' })).toBe('c-updated')
      expect(mockRepo.updateComment).toHaveBeenCalledWith('1', { content: 'test' })
    })

    it('getCommentsByReportId', async () => {
      mockRepo.getCommentsByReportId.mockResolvedValue(['c1'])
      expect(await useCases.getCommentsByReportId('1')).toEqual(['c1'])
      expect(mockRepo.getCommentsByReportId).toHaveBeenCalledWith('1')
    })

    it('deleteComment', async () => {
      mockRepo.deleteComment.mockResolvedValue(undefined)
      await useCases.deleteComment('1')
      expect(mockRepo.deleteComment).toHaveBeenCalledWith('1')
    })
  })

  describe('VoteUseCases', () => {
    const mockRepo = {
      addVote: vi.fn(),
      removeVote: vi.fn(),
      getVoteCount: vi.fn(),
      checkUserVote: vi.fn()
    }

    let useCases: VoteUseCases

    beforeEach(() => {
      vi.clearAllMocks()
      useCases = new VoteUseCases(mockRepo as any)
    })

    it('toggleVote - add', async () => {
      mockRepo.addVote.mockResolvedValue(undefined)
      await useCases.toggleVote('1', false) // Currently not voted, so add
      expect(mockRepo.addVote).toHaveBeenCalledWith('1')
    })

    it('toggleVote - remove', async () => {
      mockRepo.removeVote.mockResolvedValue(undefined)
      await useCases.toggleVote('1', true) // Currently voted, so remove
      expect(mockRepo.removeVote).toHaveBeenCalledWith('1')
    })

    it('getVoteInfo', async () => {
      mockRepo.getVoteCount.mockResolvedValue(10)
      mockRepo.checkUserVote.mockResolvedValue(true)
      const info = await useCases.getVoteInfo('1')
      expect(info).toEqual({ count: 10, isVoted: true })
      expect(mockRepo.getVoteCount).toHaveBeenCalledWith('1')
      expect(mockRepo.checkUserVote).toHaveBeenCalledWith('1')
    })
  })
})