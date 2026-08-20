'use client';

import { useAdminDashboard } from '@/hooks/useAdminDashboard';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { ADMIN_SELECT_CLASS } from '@/components/admin/AdminFilterBar';

export function AdminCreatePanel() {
  const {
    adminForm,
    setAdminForm,
    handleCreateAdmin,
} = useAdminDashboard();
  return (
<AdminPanelCard className="max-w-lg">
<div>
                        <h2 className="text-lg font-semibold text-slate-900">관리자 계정 생성</h2>
                        <p className="mt-1 text-sm text-slate-600">
                            운영/고객지원/재무 관리자 계정을 생성합니다.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>이메일</Label>
                            <Input
                                value={adminForm.email}
                                onChange={(e) =>
                                    setAdminForm((prev) => ({
                                        ...prev,
                                        email: e.target.value,
                                    }))
                                }
                                placeholder="admin2@example.com"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>비밀번호</Label>
                            <Input
                                type="password"
                                value={adminForm.password}
                                onChange={(e) =>
                                    setAdminForm((prev) => ({
                                        ...prev,
                                        password: e.target.value,
                                    }))
                                }
                                placeholder="비밀번호"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>관리자 역할</Label>
                            <select
                                className={`${ADMIN_SELECT_CLASS} w-full`}
                                value={adminForm.adminRole}
                                onChange={(e) =>
                                    setAdminForm((prev) => ({
                                        ...prev,
                                        adminRole: e.target.value,
                                    }))
                                }
                            >
                                <option value="CustomerSupport">고객지원</option>
                                <option value="Operations">운영</option>
                                <option value="Finance">재무</option>
                            </select>
                        </div>
                        <Button className="w-full bg-sky-700 hover:bg-sky-800" onClick={handleCreateAdmin}>관리자 생성</Button>
                    </div>
</AdminPanelCard>
  );
}
