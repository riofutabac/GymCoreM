'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { Member } from '@/lib/api/types';
import { DataTable } from '@/components/shared/DataTable';
import { DataTableSkeleton } from '@/components/shared/DataTableSkeleton';
import { columns } from '@/components/manager/members/columns';
import MemberFormModal from '@/components/manager/members/MemberFormModal';
import { getMembersForManager } from '@/lib/api/manager';

export default function ManagerMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      // No es necesario volver a poner loading a true si ya está en true
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

  const handleOpenModal = (member: Member | null = null) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMember(null);
    setLoading(true); // Mostrar loader mientras se recargan los datos
    fetchMembers();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gestión de Miembros</CardTitle>
          <Button onClick={() => handleOpenModal()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Miembro
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
      
      {isModalOpen && (
        <MemberFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          member={selectedMember}
        />
      )}
    </div>
  );
}