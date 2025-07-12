'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { Member } from '@/lib/api/types';
import { DataTable } from '@/components/shared/DataTable';
import { DataTableSkeleton } from '@/components/shared/DataTableSkeleton';
import { columns } from '@/components/manager/members/columns';
import MemberFormModal from '@/components/manager/members/MemberFormModal';
import { getMembersForManager, exportMembers } from '@/lib/api/manager';

export default function ManagerMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const data = await getMembersForManager();
      setMembers(data);
    } catch (error) {
      console.error("Failed to fetch members", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleOpenModal = (member: Member) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMember(null);
    setLoading(true);
    fetchMembers();
  };

  const handleExportMembers = async () => {
    try {
      const blob = await exportMembers();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `miembros-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exportando miembros:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gestión de Miembros</CardTitle>
          <Button onClick={handleExportMembers} variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Exportar Miembros
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <DataTableSkeleton columnCount={5} />
          ) : (
            <DataTable 
              columns={columns(handleOpenModal)} 
              data={members}
              filterColumn="email"
              filterPlaceholder="Filtrar por email..."
            />
          )}
        </CardContent>
      </Card>
      
      {isModalOpen && selectedMember && (
        <MemberFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          member={selectedMember}
        />
      )}
    </div>
  );
}