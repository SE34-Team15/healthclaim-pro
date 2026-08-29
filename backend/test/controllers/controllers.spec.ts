import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthController } from '../../src/auth/auth.controller';
import { ClaimsController } from '../../src/claims/claims.controller';
import { RulesController } from '../../src/rules/rules.controller';
import { PoliciesController } from '../../src/policies/policies.controller';
import { DepartmentsController } from '../../src/departments/departments.controller';
import { AnalyticsController } from '../../src/analytics/analytics.controller';
import { AuditController } from '../../src/audit/audit.controller';
import { UsersController } from '../../src/users/users.controller';
import { AttachmentsController } from '../../src/storage/attachments.controller';
import { UserRole, ClaimStatus, ClaimCategory } from '@healthclaim/shared';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

describe('API Controllers Unit Tests', () => {
  describe('AuthController', () => {
    let controller: AuthController;
    let authServiceMock: any;

    beforeEach(() => {
      authServiceMock = {
        login: vi.fn().mockResolvedValue({ accessToken: 'token-123' }),
        register: vi.fn().mockResolvedValue({ id: 'user-1' }),
        sendVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
        verifyEmail: vi.fn().mockResolvedValue({ success: true }),
      };
      controller = new AuthController(authServiceMock);
    });

    it('should delegate login', async () => {
      const req: any = { ip: '127.0.0.1', socket: {}, headers: { 'user-agent': 'vitest' } };
      const res = await controller.login({ email: 'test@example.com', password: 'password' }, req);
      expect(res).toEqual({ accessToken: 'token-123' });
      expect(authServiceMock.login).toHaveBeenCalled();
    });

    it('should delegate register', async () => {
      const req: any = { ip: '127.0.0.1', socket: {}, headers: { 'user-agent': 'vitest' } };
      const res = await controller.register(
        {
          email: 'test@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
          departmentId: 'dept-1',
        },
        req,
      );
      expect(res).toEqual({ id: 'user-1' });
      expect(authServiceMock.register).toHaveBeenCalled();
    });

    it('should delegate email verification methods', async () => {
      const sendRes = await controller.sendVerificationEmail({ id: 'user-1' } as any);
      expect(sendRes).toEqual({ success: true });

      const verifyRes = await controller.verifyEmail('token-abc');
      expect(verifyRes).toEqual({ success: true });
    });
  });

  describe('ClaimsController', () => {
    let controller: ClaimsController;
    let claimsServiceMock: any;

    beforeEach(() => {
      claimsServiceMock = {
        previewCalculation: vi.fn().mockResolvedValue({ reimbursedAmount: 200 }),
        submitClaim: vi.fn().mockResolvedValue({ id: 'claim-1' }),
        transitionStatus: vi.fn().mockResolvedValue({ id: 'claim-1', status: ClaimStatus.SETTLED }),
        forcePurgeClaim: vi.fn().mockResolvedValue({ success: true }),
        getMyClaims: vi.fn().mockResolvedValue([]),
        getAllClaims: vi.fn().mockResolvedValue([]),
        getClaimById: vi.fn().mockResolvedValue({ id: 'claim-1' }),
      };
      controller = new ClaimsController(claimsServiceMock);
    });

    it('should delegate previewCalculation and submitClaim', async () => {
      const dto: any = {
        category: ClaimCategory.CONSULTATION,
        invoiceDate: '2026-08-28',
        hospitalName: 'Hospital',
        items: [],
      };
      await controller.previewCalculation('user-1', dto);
      expect(claimsServiceMock.previewCalculation).toHaveBeenCalledWith('user-1', dto);

      await controller.submitClaim('user-1', dto, '127.0.0.1');
      expect(claimsServiceMock.submitClaim).toHaveBeenCalledWith('user-1', dto, '127.0.0.1');
    });

    it('should delegate transitionClaimStatus and forcePurgeClaim', async () => {
      const user = { id: 'admin-1', role: UserRole.SYSTEM_ADMIN };
      await controller.transitionClaimStatus('claim-1', user, { targetStatus: ClaimStatus.SETTLED }, '127.0.0.1');
      expect(claimsServiceMock.transitionStatus).toHaveBeenCalledWith('claim-1', ClaimStatus.SETTLED, user, undefined, '127.0.0.1');

      await controller.forcePurgeClaim('claim-1', 'admin-1', '127.0.0.1');
      expect(claimsServiceMock.forcePurgeClaim).toHaveBeenCalledWith('claim-1', 'admin-1', '127.0.0.1');
    });

    it('should delegate getMyClaims, getAllClaims, and getClaimById', async () => {
      await controller.getMyClaims('user-1');
      expect(claimsServiceMock.getMyClaims).toHaveBeenCalledWith('user-1');

      await controller.getAllClaims(ClaimStatus.SUBMITTED, 'searchQuery');
      expect(claimsServiceMock.getAllClaims).toHaveBeenCalledWith(ClaimStatus.SUBMITTED, 'searchQuery');

      await controller.getClaimById('claim-1', { id: 'user-1', role: UserRole.EMPLOYEE });
      expect(claimsServiceMock.getClaimById).toHaveBeenCalledWith('claim-1', { id: 'user-1', role: UserRole.EMPLOYEE });
    });
  });

  describe('RulesController', () => {
    let controller: RulesController;
    let ruleEngineMock: any;

    beforeEach(() => {
      ruleEngineMock = {
        getAllRules: vi.fn().mockResolvedValue([]),
        reorderRules: vi.fn().mockResolvedValue([]),
        createRule: vi.fn().mockResolvedValue({ id: 'rule-1' }),
        updateRule: vi.fn().mockResolvedValue({ id: 'rule-1' }),
        deleteRule: vi.fn().mockResolvedValue({ message: 'deleted' }),
      };
      controller = new RulesController(ruleEngineMock);
    });

    it('should delegate rule operations', async () => {
      const actor: any = { id: 'admin-1' };
      await controller.getAllRules();
      expect(ruleEngineMock.getAllRules).toHaveBeenCalled();

      await controller.reorderRules({ ruleIds: ['1', '2'] }, actor);
      expect(ruleEngineMock.reorderRules).toHaveBeenCalledWith(['1', '2'], 'admin-1');

      const createDto: any = { code: 'R1', name: 'Rule 1', astDefinition: {} };
      await controller.createRule(createDto, actor);
      expect(ruleEngineMock.createRule).toHaveBeenCalledWith(createDto, 'admin-1');

      const updateDto: any = { name: 'Rule Updated' };
      await controller.updateRule('rule-1', updateDto, actor);
      expect(ruleEngineMock.updateRule).toHaveBeenCalledWith('rule-1', updateDto, 'admin-1');

      await controller.deleteRule('rule-1', actor);
      expect(ruleEngineMock.deleteRule).toHaveBeenCalledWith('rule-1', 'admin-1');
    });
  });

  describe('PoliciesController', () => {
    let controller: PoliciesController;
    let policiesServiceMock: any;

    beforeEach(() => {
      policiesServiceMock = {
        getAllBenefitTiers: vi.fn().mockResolvedValue([]),
        createBenefitTier: vi.fn().mockResolvedValue({ id: 'tier-1' }),
        updateBenefitTier: vi.fn().mockResolvedValue({ id: 'tier-1' }),
        deleteBenefitTier: vi.fn().mockResolvedValue({ message: 'deleted' }),
        assignTierToUser: vi.fn().mockResolvedValue({ id: 'quota-1' }),
        getUserQuotas: vi.fn().mockResolvedValue([]),
      };
      controller = new PoliciesController(policiesServiceMock);
    });

    it('should delegate tier CRUD and assignment', async () => {
      const actor: any = { id: 'admin-1', role: UserRole.SYSTEM_ADMIN };
      await controller.getAllTiers();
      expect(policiesServiceMock.getAllBenefitTiers).toHaveBeenCalled();

      const createDto: any = { name: 'Gold', code: 'GOLD', annualLimit: 5000, defaultDeductible: 0, defaultCoPayRate: 0.9 };
      await controller.createTier(createDto, actor);
      expect(policiesServiceMock.createBenefitTier).toHaveBeenCalledWith(createDto, 'admin-1');

      await controller.updateTier('tier-1', { name: 'Gold Plus' } as any, actor);
      expect(policiesServiceMock.updateBenefitTier).toHaveBeenCalledWith('tier-1', { name: 'Gold Plus' }, 'admin-1');

      await controller.deleteTier('tier-1', actor);
      expect(policiesServiceMock.deleteBenefitTier).toHaveBeenCalledWith('tier-1', 'admin-1');

      const assignDto: any = { userId: 'user-1', benefitTierId: 'tier-1', fiscalYear: 2026 };
      await controller.assignPolicy(assignDto, actor);
      expect(policiesServiceMock.assignTierToUser).toHaveBeenCalledWith(assignDto, 'admin-1');
    });

    it('should restrict regular employees from viewing other users quotas', async () => {
      const empUser: any = { id: 'emp-1', role: UserRole.EMPLOYEE };
      await controller.getUserQuotas('emp-2', empUser);
      expect(policiesServiceMock.getUserQuotas).toHaveBeenCalledWith('emp-1');

      const adminUser: any = { id: 'admin-1', role: UserRole.SYSTEM_ADMIN };
      await controller.getUserQuotas('emp-2', adminUser);
      expect(policiesServiceMock.getUserQuotas).toHaveBeenCalledWith('emp-2');
    });
  });

  describe('DepartmentsController', () => {
    let controller: DepartmentsController;
    let departmentsServiceMock: any;

    beforeEach(() => {
      departmentsServiceMock = {
        getActiveDepartments: vi.fn().mockResolvedValue([]),
        getAllDepartments: vi.fn().mockResolvedValue([]),
        createDepartment: vi.fn().mockResolvedValue({ id: 'dept-1' }),
        updateDepartment: vi.fn().mockResolvedValue({ id: 'dept-1' }),
        deleteDepartment: vi.fn().mockResolvedValue({ message: 'deleted' }),
      };
      controller = new DepartmentsController(departmentsServiceMock);
    });

    it('should delegate departments methods', async () => {
      const actor: any = { id: 'admin-1' };
      await controller.getActiveDepartments();
      expect(departmentsServiceMock.getActiveDepartments).toHaveBeenCalled();

      await controller.getAllDepartments();
      expect(departmentsServiceMock.getAllDepartments).toHaveBeenCalled();

      const createDto: any = { name: 'HR', code: 'HR' };
      await controller.createDepartment(createDto, actor);
      expect(departmentsServiceMock.createDepartment).toHaveBeenCalledWith(createDto, 'admin-1');

      await controller.updateDepartment('dept-1', { name: 'HR Ops' } as any, actor);
      expect(departmentsServiceMock.updateDepartment).toHaveBeenCalledWith('dept-1', { name: 'HR Ops' }, 'admin-1');

      await controller.deleteDepartment('dept-1', actor);
      expect(departmentsServiceMock.deleteDepartment).toHaveBeenCalledWith('dept-1', 'admin-1');
    });
  });

  describe('AnalyticsController', () => {
    let controller: AnalyticsController;
    let analyticsServiceMock: any;

    beforeEach(() => {
      analyticsServiceMock = {
        getAdminOverview: vi.fn().mockResolvedValue({}),
        getFinanceAnalytics: vi.fn().mockResolvedValue({}),
        getUnderwritingAnalytics: vi.fn().mockResolvedValue({}),
        getSecurityAnalytics: vi.fn().mockResolvedValue({}),
        getEmployeeAnalytics: vi.fn().mockResolvedValue({}),
      };
      controller = new AnalyticsController(analyticsServiceMock);
    });

    it('should delegate all analytics endpoints', async () => {
      await controller.getAdminOverview();
      expect(analyticsServiceMock.getAdminOverview).toHaveBeenCalled();

      await controller.getFinanceAnalytics();
      expect(analyticsServiceMock.getFinanceAnalytics).toHaveBeenCalled();

      await controller.getUnderwritingAnalytics();
      expect(analyticsServiceMock.getUnderwritingAnalytics).toHaveBeenCalled();

      await controller.getSecurityAnalytics();
      expect(analyticsServiceMock.getSecurityAnalytics).toHaveBeenCalled();

      await controller.getEmployeeAnalytics('user-1');
      expect(analyticsServiceMock.getEmployeeAnalytics).toHaveBeenCalledWith('user-1');
    });
  });

  describe('AuditController', () => {
    let controller: AuditController;
    let auditServiceMock: any;

    beforeEach(() => {
      auditServiceMock = {
        getAuditLogs: vi.fn().mockResolvedValue({ logs: [], total: 0 }),
        exportAuditLogsCsv: vi.fn().mockResolvedValue('timestamp,actor,action\n'),
      };
      controller = new AuditController(auditServiceMock);
    });

    it('should delegate getAuditLogs with pagination parameters', async () => {
      await controller.getAuditLogs('LOGIN', 'actor-1', 'User', '1', '20');
      expect(auditServiceMock.getAuditLogs).toHaveBeenCalledWith({
        action: 'LOGIN',
        actorId: 'actor-1',
        targetResource: 'User',
        page: 1,
        pageSize: 20,
      });
    });

    it('should delegate exportAuditLogsCsv and set proper download headers', async () => {
      const res: any = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnValue({ send: vi.fn().mockReturnValue('csv') }),
      };
      await controller.exportAuditLogsCsv('LOGIN', res);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(auditServiceMock.exportAuditLogsCsv).toHaveBeenCalledWith('LOGIN');
    });
  });

  describe('UsersController', () => {
    let controller: UsersController;
    let usersServiceMock: any;

    beforeEach(() => {
      usersServiceMock = {
        getCurrentUserProfile: vi.fn().mockResolvedValue({ id: 'user-1' }),
        updateMyProfile: vi.fn().mockResolvedValue({ id: 'user-1' }),
        getAllUsers: vi.fn().mockResolvedValue({ users: [], total: 0 }),
        updateUserRole: vi.fn().mockResolvedValue({ id: 'user-1' }),
        updateUserStatus: vi.fn().mockResolvedValue({ id: 'user-1' }),
        adminCreateUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
        adminUpdateUserProfile: vi.fn().mockResolvedValue({ id: 'user-1' }),
      };
      controller = new UsersController(usersServiceMock);
    });

    it('should delegate all user management endpoints', async () => {
      const actor: any = { id: 'admin-1' };
      await controller.getMyProfile(actor);
      expect(usersServiceMock.getCurrentUserProfile).toHaveBeenCalledWith('admin-1');

      await controller.updateMyProfile('user-1', { firstName: 'Alice' } as any);
      expect(usersServiceMock.updateMyProfile).toHaveBeenCalledWith('user-1', { firstName: 'Alice' });

      await controller.getAllUsers(UserRole.EMPLOYEE, 'alice', '1', '10');
      expect(usersServiceMock.getAllUsers).toHaveBeenCalledWith({
        role: UserRole.EMPLOYEE,
        search: 'alice',
        page: 1,
        pageSize: 10,
      });

      await controller.updateUserRole('target-1', { role: UserRole.CLAIM_OFFICER } as any, actor);
      expect(usersServiceMock.updateUserRole).toHaveBeenCalledWith('target-1', { role: UserRole.CLAIM_OFFICER }, 'admin-1');

      await controller.updateUserStatus('target-1', { isActive: false } as any, actor);
      expect(usersServiceMock.updateUserStatus).toHaveBeenCalledWith('target-1', { isActive: false }, 'admin-1');

      const createDto: any = { email: 'a@b.com', firstName: 'A', lastName: 'B', role: UserRole.EMPLOYEE, departmentId: 'dept-1' };
      await controller.adminCreateUser(createDto, actor);
      expect(usersServiceMock.adminCreateUser).toHaveBeenCalledWith(createDto, 'admin-1');

      const updateDto: any = { firstName: 'Updated' };
      await controller.adminUpdateUserProfile('target-1', updateDto, actor);
      expect(usersServiceMock.adminUpdateUserProfile).toHaveBeenCalledWith('target-1', updateDto, 'admin-1');
    });
  });

  describe('AttachmentsController', () => {
    let controller: AttachmentsController;
    let storageServiceMock: any;
    let prismaMock: any;
    let auditServiceMock: any;

    beforeEach(() => {
      storageServiceMock = {
        encryptAndStore: vi.fn().mockResolvedValue({
          storageKey: 'key.enc',
          encryptedDek: 'dek-123',
          iv: 'iv-123',
          authTag: 'tag-123',
          checksum: 'sha-123',
          magicHeader: 'HC_ENC',
        }),
        retrieveAndDecrypt: vi.fn().mockResolvedValue(Buffer.from('decrypted-content')),
        deleteStoredFile: vi.fn().mockResolvedValue(undefined),
      };
      prismaMock = {
        receiptAttachment: {
          create: vi.fn().mockResolvedValue({
            id: 'att-1',
            claimId: null,
            fileName: 'invoice.pdf',
            fileSize: 1024,
            mimeType: 'application/pdf',
            checksum: 'sha-123',
            createdAt: new Date(),
          }),
          findUnique: vi.fn(),
          delete: vi.fn().mockResolvedValue({}),
        },
      };
      auditServiceMock = {
        log: vi.fn().mockResolvedValue({}),
      };
      controller = new AttachmentsController(storageServiceMock, prismaMock, auditServiceMock);
    });

    it('should throw BadRequestException on empty file or unsupported mime type', async () => {
      await expect(controller.uploadAttachment(null as any, 'user-1', '127.0.0.1')).rejects.toThrow(
        BadRequestException,
      );

      const invalidFile: any = { mimetype: 'application/x-executable' };
      await expect(controller.uploadAttachment(invalidFile, 'user-1', '127.0.0.1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should upload and encrypt valid file', async () => {
      const file: any = {
        originalname: 'invoice.pdf',
        size: 1024,
        mimetype: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 test'),
      };
      const res = await controller.uploadAttachment(file, 'user-1', '127.0.0.1');
      expect(res.id).toBe('att-1');
      expect(storageServiceMock.encryptAndStore).toHaveBeenCalled();
      expect(prismaMock.receiptAttachment.create).toHaveBeenCalled();
    });

    it('should preview attachment when authorized', async () => {
      prismaMock.receiptAttachment.findUnique.mockResolvedValue({
        id: 'att-1',
        userId: 'user-1',
        fileName: 'receipt.pdf',
        mimeType: 'application/pdf',
        storageKey: 'key.enc',
        encryptedDek: 'dek-123',
        checksum: 'sha-123',
      });
      const res: any = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnValue({ send: vi.fn().mockReturnValue('ok') }),
      };

      await controller.previewAttachment('att-1', { id: 'user-1', role: UserRole.EMPLOYEE }, res, '127.0.0.1');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(storageServiceMock.retrieveAndDecrypt).toHaveBeenCalled();
    });

    it('should forbid unauthorized users from previewing attachment', async () => {
      prismaMock.receiptAttachment.findUnique.mockResolvedValue({
        id: 'att-1',
        userId: 'user-1',
      });
      const res: any = {};
      await expect(
        controller.previewAttachment('att-1', { id: 'other-user', role: UserRole.EMPLOYEE }, res, '127.0.0.1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle download attachment', async () => {
      prismaMock.receiptAttachment.findUnique.mockResolvedValue({
        id: 'att-1',
        userId: 'user-1',
        fileName: 'receipt.pdf',
        mimeType: 'application/pdf',
        storageKey: 'key.enc',
        encryptedDek: 'dek-123',
        checksum: 'sha-123',
      });
      const res: any = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnValue({ send: vi.fn().mockReturnValue('ok') }),
      };

      await controller.downloadAttachment('att-1', { id: 'user-1', role: UserRole.EMPLOYEE }, res, '127.0.0.1');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    });

    it('should delete unlinked attachment', async () => {
      prismaMock.receiptAttachment.findUnique.mockResolvedValue({
        id: 'att-1',
        userId: 'user-1',
        claimId: null,
        storageKey: 'key.enc',
      });

      const res = await controller.deleteAttachment('att-1', { id: 'user-1', role: UserRole.EMPLOYEE }, '127.0.0.1');
      expect(res.message).toContain('deleted successfully');
      expect(storageServiceMock.deleteStoredFile).toHaveBeenCalled();
      expect(prismaMock.receiptAttachment.delete).toHaveBeenCalled();
    });

    it('should prevent deleting attached or non-owned files', async () => {
      prismaMock.receiptAttachment.findUnique.mockResolvedValue({
        id: 'att-1',
        userId: 'user-1',
        claimId: 'claim-123',
      });

      await expect(
        controller.deleteAttachment('att-1', { id: 'other-user', role: UserRole.EMPLOYEE }, '127.0.0.1'),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        controller.deleteAttachment('att-1', { id: 'user-1', role: UserRole.EMPLOYEE }, '127.0.0.1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
