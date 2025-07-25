'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Fingerprint } from 'lucide-react';
import { Member } from '@/lib/api/types';
import { DataTable } from '@/components/shared/DataTable';
import { DataTableSkeleton } from '@/components/shared/DataTableSkeleton';
import { columns } from '@/components/manager/members/columns';
import MemberFormModal from '@/components/manager/members/MemberFormModal';
import { getMembersForManager, exportMembers } from '@/lib/api/manager';
import { API_V1_URL } from '@/lib/api/config';

export default function ManagerMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [biometricStatus, setBiometricStatus] = useState<'Conectado' | 'Desconectado' | 'Conectando...' | 'Error'>('Conectando...');

  const fetchMembers = useCallback(async () => {
    try {
      const membersArray = await getMembersForManager();
      setMembers(membersArray);
    } catch (error) {
      console.error("Failed to fetch members", error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para verificar el estado del biométrico
  const checkBiometricStatus = useCallback(async () => {
    try {
      const API_BASE_URL = API_V1_URL();
      const response = await fetch(`${API_BASE_URL}/biometric/health`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        // Verificar si el Arduino/agente está conectado
        if (data.arduino?.connected) {
          setBiometricStatus('Conectado');
        } else {
          setBiometricStatus('Desconectado');
        }
      } else {
        setBiometricStatus('Error');
      }
    } catch (error) {
      console.error('Error verificando estado biométrico:', error);
      setBiometricStatus('Desconectado');
    }
  }, []);

  useEffect(() => {
    fetchMembers();
    checkBiometricStatus();
    
    // Verificar estado biométrico cada 10 segundos
    const biometricInterval = setInterval(checkBiometricStatus, 10000);
    
    return () => {
      clearInterval(biometricInterval);
    };
  }, [fetchMembers, checkBiometricStatus]);

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
          <div className="flex items-center gap-4">
            <CardTitle>Gestión de Miembros</CardTitle>
            <div className="flex items-center gap-2">
              <Fingerprint className="h-4 w-4" />
              <Badge 
                variant={biometricStatus === 'Conectado' ? 'default' : biometricStatus === 'Conectando...' ? 'secondary' : 'destructive'}
              >
                {biometricStatus}
              </Badge>
            </div>
          </div>
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
              columns={columns(handleOpenModal, biometricStatus === 'Conectado')} 
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