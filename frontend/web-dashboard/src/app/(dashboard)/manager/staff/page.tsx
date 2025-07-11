'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { StaffMember, Member } from '@/lib/api/types';
import { DataTable } from '@/components/shared/DataTable';
import { DataTableSkeleton } from '@/components/shared/DataTableSkeleton';
import { columns } from '@/components/manager/staff/columns';
import AssignStaffModal from '@/components/manager/staff/AssignStaffModal';
import { getGymStaff, getMembersForManager } from '@/lib/api/manager';

export default function ManagerStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [staffData, membersData] = await Promise.all([
        getGymStaff(),
        getMembersForManager(),
      ]);
      setStaff(staffData);
      
      // Filtrar miembros que no son staff para mostrar en el modal
      const staffIds = new Set(staffData.map(s => s.id));
      const availableMembers = membersData.filter(m => !staffIds.has(m.id));
      setMembers(availableMembers);

    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setLoading(true);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gestión de Personal</CardTitle>
          <Button onClick={() => setIsModalOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Asignar Personal
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <DataTableSkeleton columnCount={3} />
          ) : (
            <DataTable 
              columns={columns} 
              data={staff} 
              filterColumn="email" 
              filterPlaceholder="Filtrar por email..."
            />
          )}
        </CardContent>
      </Card>
      
      {isModalOpen && (
        <AssignStaffModal 
          isOpen={isModalOpen} 
          onClose={handleCloseModal} 
          members={members}
        />
      )}
    </div>
  );
}
