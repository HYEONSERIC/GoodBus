'use client';

import { useAdminDashboard } from '@/hooks/useAdminDashboard';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminFilterBar, AdminFilterField, ADMIN_SELECT_CLASS } from '@/components/admin/AdminFilterBar';

export function AdminCreatePanel() {
  const {
    adminForm,
    setAdminForm,
    adminRole,
    handleCreateAdmin,
} = useAdminDashboard();
  return (
<AdminPanelCard>
<h2 className="text-lg font-semibold">관리자 계정 생성</h2>
                    <p className="text-sm text-gray-600">
                        운영/고객지원/재무 관리자 계정을 생성합니다.
                    </p>
                    <div className="space-y-3">
                        <div>
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
                        <div>
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
                        <div>
                            <Label>관리자 역할</Label>
                            <select
                                className="border rounded px-2 py-1 w-full"
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
                        <Button onClick={handleCreateAdmin}>관리자 생성</Button>
                    </div>
</AdminPanelCard>
  );
}
