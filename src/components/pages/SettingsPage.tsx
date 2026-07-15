'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Users,
  Shield,
  Server,
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Power,
  Download,
  RefreshCw,
  Ghost,
  Database,
  Monitor,
  Calendar,
  CheckCircle2,
} from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

// ── Types ──

interface UserRow {
  id: string
  email: string
  name: string
  isActive: boolean
  lastLogin: string | null
  createdAt: string
  updatedAt: string
  employeeId: string | null
  role: { id: string; name: string; description: string | null }
  employee: { id: string; matricule: string; firstName: string; lastName: string } | null
}

interface RoleItem {
  id: string
  name: string
  description: string | null
  permissions: string
  createdAt: string
  updatedAt: string
}

interface RoleWithCount extends RoleItem {
  _count: { users: number }
}

interface EmployeeOption {
  id: string
  matricule: string
  firstName: string
  lastName: string
}

// ── Helpers ──

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Jamais'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffMonth = Math.floor(diffDay / 30)

  if (diffSec < 60) return "À l'instant"
  if (diffMin < 60) return `il y a ${diffMin}min`
  if (diffHour < 24) return `il y a ${diffHour}h`
  if (diffDay < 30) return `il y a ${diffDay}j`
  if (diffMonth < 12) return `il y a ${diffMonth}mois`
  return `il y a ${Math.floor(diffMonth / 12)}an${Math.floor(diffMonth / 12) > 1 ? 's' : ''}`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function isPhantom(email: string): boolean {
  return email === 'fantomas@afwasa.org'
}

// ── Permission Groups ──

const PERMISSION_GROUPS: Record<string, { label: string; icon: string }> = {
  dashboard: { label: 'Tableau de bord', icon: '📊' },
  employees: { label: 'Employés', icon: '👥' },
  contracts: { label: 'Contrats', icon: '📄' },
  salary_profiles: { label: 'Profils salariaux', icon: '💰' },
  payroll: { label: 'Paie', icon: '🏛️' },
  payslips: { label: 'Bulletins', icon: '🧾' },
  parameters: { label: 'Paramètres', icon: '⚙️' },
  users: { label: 'Utilisateurs', icon: '🔐' },
  audit: { label: 'Audit', icon: '📋' },
  settings: { label: 'Système', icon: '🖥️' },
}

function groupPermissions(permissions: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {}
  for (const perm of permissions) {
    const [prefix, ...rest] = perm.split('.')
    if (!groups[prefix]) groups[prefix] = []
    if (rest.length > 0) groups[prefix].push(rest.join('.'))
  }
  return groups
}

// ── Sidebar Tab Config ──

const SETTINGS_TABS = [
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'roles', label: 'Rôles', icon: Shield },
  { id: 'system', label: 'Système', icon: Server },
] as const

type TabId = (typeof SETTINGS_TABS)[number]['id']

// ── Main Component ──

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('users')

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section className="animate-fade-in-up">
        <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-sm text-muted-foreground">
          Configuration du système et gestion des accès
        </p>
      </section>

      {/* Layout: Sidebar + Content */}
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Sidebar Navigation */}
        <nav className="animate-fade-in-up stagger-1 md:w-56 shrink-0">
          <div className="flex flex-row gap-1 md:flex-col md:gap-1">
            {SETTINGS_TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left w-full ${
                    isActive
                      ? 'bg-[#362981]/10 text-[#362981] dark:bg-[#362981]/20 dark:text-[#C7A8FF]'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'users' && <UsersSection />}
          {activeTab === 'roles' && <RolesSection />}
          {activeTab === 'system' && <SystemSection />}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// ── SECTION 1: USERS ──
// ═══════════════════════════════════════════════

function UsersSection() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState<string>('__all__')
  const [statusFilter, setStatusFilter] = useState<string>('__all__')

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRoleId, setFormRoleId] = useState('')
  const [formEmployeeId, setFormEmployeeId] = useState('')
  const [saving, setSaving] = useState(false)

  const PAGE_SIZE = 10

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {
        page: String(page),
        limit: String(PAGE_SIZE),
      }
      if (search) params.search = search
      if (roleFilter && roleFilter !== '__all__') params.roleId = roleFilter
      if (statusFilter && statusFilter !== '__all__') params.isActive = statusFilter

      const res = await api.get<{
        data: UserRow[]
        total: number
        roles: RoleItem[]
      }>('/api/users', params)

      setUsers(res.data || [])
      setTotal(res.total || 0)
      setRoles(res.roles || [])
    } catch {
      toast.error('Erreur lors du chargement des utilisateurs')
    } finally {
      setLoading(false)
    }
  }, [page, search, roleFilter, statusFilter])

  // Fetch employees for dropdown
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await api.get<{ data: EmployeeOption[] }>('/api/employees', {
        limit: '200',
        offset: '0',
      })
      setEmployees(res.data || [])
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    if (dialogOpen) fetchEmployees()
  }, [dialogOpen, fetchEmployees])

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [search, roleFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Open create dialog
  const openCreateDialog = () => {
    setEditingUser(null)
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setFormRoleId(roles[0]?.id || '')
    setFormEmployeeId('__none__')
    setDialogOpen(true)
  }

  // Open edit dialog
  const openEditDialog = (user: UserRow) => {
    setEditingUser(user)
    setFormName(user.name)
    setFormEmail(user.email)
    setFormPassword('')
    setFormRoleId(user.role.id)
    setFormEmployeeId(user.employeeId || '__none__')
    setDialogOpen(true)
  }

  // Save user (create or update)
  const handleSave = async () => {
    if (!formName.trim() || !formEmail.trim() || !formRoleId) {
      toast.error('Veuillez remplir tous les champs requis')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formEmail)) {
      toast.error("Format d'email invalide")
      return
    }

    try {
      setSaving(true)

      if (editingUser) {
        // Update
        const updateData: Record<string, unknown> = {
          name: formName.trim(),
          email: formEmail.trim(),
          roleId: formRoleId,
          employeeId: formEmployeeId && formEmployeeId !== '__none__' ? formEmployeeId : null,
        }
        if (formPassword.trim()) {
          updateData.password = formPassword.trim()
        }
        await api.put(`/api/users/${editingUser.id}`, updateData)
        toast.success('Utilisateur mis à jour avec succès')
      } else {
        // Create
        if (!formPassword.trim()) {
          toast.error('Le mot de passe est requis pour un nouvel utilisateur')
          setSaving(false)
          return
        }
        await api.post('/api/users', {
          name: formName.trim(),
          email: formEmail.trim(),
          password: formPassword.trim(),
          roleId: formRoleId,
          employeeId: formEmployeeId && formEmployeeId !== '__none__' ? formEmployeeId : null,
        })
        toast.success('Utilisateur créé avec succès')
      }

      setDialogOpen(false)
      fetchUsers()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  // Toggle user active status
  const handleToggleActive = async (user: UserRow) => {
    if (isPhantom(user.email)) {
      toast.error('Le compte Fantôme ne peut pas être modifié')
      return
    }
    try {
      await api.put(`/api/users/${user.id}`, { isActive: !user.isActive })
      toast.success(user.isActive ? 'Utilisateur désactivé' : 'Utilisateur activé')
      fetchUsers()
    } catch {
      toast.error("Erreur lors du changement de statut")
    }
  }

  // Open delete dialog
  const openDeleteDialog = (user: UserRow) => {
    if (isPhantom(user.email)) {
      toast.error('Le compte Fantôme ne peut pas être supprimé')
      return
    }
    setDeletingUser(user)
    setDeleteDialogOpen(true)
  }

  // Confirm delete
  const handleDelete = async () => {
    if (!deletingUser) return
    try {
      await api.delete(`/api/users/${deletingUser.id}`)
      toast.success('Utilisateur désactivé avec succès')
      setDeleteDialogOpen(false)
      setDeletingUser(null)
      fetchUsers()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la désactivation'
      toast.error(message)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Gestion des Utilisateurs</h2>
          <p className="text-sm text-muted-foreground">
            {total} utilisateur{total !== 1 ? 's' : ''} enregistré{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={openCreateDialog} className="bg-[#362981] hover:bg-[#362981]/90 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Nouvel utilisateur
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Tous les rôles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les rôles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les statuts</SelectItem>
            <SelectItem value="true">Actif</SelectItem>
            <SelectItem value="false">Inactif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="mb-2 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="max-h-[480px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Utilisateur
                  </TableHead>
                  <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                    Email
                  </TableHead>
                  <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">
                    Rôle
                  </TableHead>
                  <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                    Employé lié
                  </TableHead>
                  <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                    Dernière connexion
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Statut
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    {/* User */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback
                            className={`text-xs font-medium text-white ${
                              isPhantom(user.email) ? 'bg-[#029CB1]' : 'bg-[#362981]'
                            }`}
                          >
                            {isPhantom(user.email) ? (
                              <Ghost className="h-4 w-4" />
                            ) : (
                              getInitials(user.name)
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">{user.name}</span>
                            {isPhantom(user.email) && (
                              <Badge
                                variant="secondary"
                                className="bg-[#029CB1]/10 text-[#029CB1] text-[10px] px-1.5 py-0"
                              >
                                Fantôme
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground lg:hidden truncate block max-w-[140px]">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Email */}
                    <TableCell className="hidden lg:table-cell">
                      <span className="font-mono text-xs text-muted-foreground truncate block max-w-[180px]">
                        {user.email}
                      </span>
                    </TableCell>

                    {/* Role */}
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant="secondary"
                        className="bg-[#362981]/10 text-[#362981] dark:bg-[#362981]/20 dark:text-[#C7A8FF]"
                      >
                        {user.role.name}
                      </Badge>
                    </TableCell>

                    {/* Employee */}
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {user.employee
                          ? `${user.employee.firstName} ${user.employee.lastName}`
                          : '—'}
                      </span>
                    </TableCell>

                    {/* Last Login */}
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(user.lastLogin)}
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          user.isActive
                            ? 'bg-[#009446]/10 text-[#009446] dark:bg-[#009446]/20 dark:text-[#C7FFEE]'
                            : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                        }
                      >
                        {user.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-[#362981]"
                          onClick={() => openEditDialog(user)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 w-8 p-0 ${
                            user.isActive
                              ? 'text-muted-foreground hover:text-orange-600'
                              : 'text-muted-foreground hover:text-[#009446]'
                          }`}
                          onClick={() => handleToggleActive(user)}
                          disabled={isPhantom(user.email)}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                          onClick={() => openDeleteDialog(user)}
                          disabled={isPhantom(user.email)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} sur {totalPages} · {total} résultat{total !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = i + 1
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0 text-xs"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}
            {totalPages > 5 && <span className="px-1 text-xs text-muted-foreground">...</span>}
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Modifiez les informations de l\'utilisateur.'
                : 'Remplissez les informations pour créer un nouvel utilisateur.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Phantom badge */}
            {editingUser && isPhantom(editingUser.email) && (
              <div className="flex items-center gap-2 rounded-lg bg-[#029CB1]/10 px-3 py-2">
                <Ghost className="h-4 w-4 text-[#029CB1]" />
                <span className="text-sm text-[#029CB1] font-medium">
                  Compte Fantôme — géré automatiquement
                </span>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="user-name">
                Nom <span className="text-red-500">*</span>
              </Label>
              <Input
                id="user-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nom complet"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="user-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@afwasa.org"
                className="font-mono"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-password">
                Mot de passe{' '}
                {!editingUser && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="user-password"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder={
                  editingUser
                    ? 'Laisser vide pour ne pas modifier'
                    : 'Définir un mot de passe'
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-role">
                Rôle <span className="text-red-500">*</span>
              </Label>
              <Select value={formRoleId} onValueChange={setFormRoleId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-employee">Employé lié</Label>
              <Select value={formEmployeeId} onValueChange={setFormEmployeeId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Aucun employé lié" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucun employé lié</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.matricule} — {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#362981] hover:bg-[#362981]/90 text-white"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver l&apos;utilisateur</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir désactiver l&apos;utilisateur{' '}
              <span className="font-semibold">{deletingUser?.name}</span> ({deletingUser?.email}) ?
              L&apos;utilisateur ne pourra plus se connecter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ═══════════════════════════════════════════════
// ── SECTION 2: ROLES ──
// ═══════════════════════════════════════════════

function RolesSection() {
  const [roles, setRoles] = useState<RoleWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRole, setExpandedRole] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .get<{ data: RoleWithCount[] }>('/api/roles')
      .then((res) => {
        if (!cancelled) setRoles(res.data || [])
      })
      .catch(() => {
        if (!cancelled) toast.error('Erreur lors du chargement des rôles')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <div>
          <h2 className="text-lg font-semibold">Gestion des Rôles</h2>
          <p className="text-sm text-muted-foreground">Permissions et accès</p>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div>
        <h2 className="text-lg font-semibold">Gestion des Rôles</h2>
        <p className="text-sm text-muted-foreground">
          {roles.length} rôle{roles.length !== 1 ? 's' : ''} configuré{roles.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {roles.map((role) => {
          const permissions: string[] = JSON.parse(role.permissions || '[]')
          const grouped = groupPermissions(permissions)
          const isExpanded = expandedRole === role.id

          return (
            <Card key={role.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{role.name}</CardTitle>
                    {role.description && (
                      <CardDescription className="mt-0.5">
                        {role.description}
                      </CardDescription>
                    )}
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-[#362981]/10 text-[#362981] dark:bg-[#362981]/20 dark:text-[#C7A8FF] shrink-0"
                  >
                    {role._count.users}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Permission count summary */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {permissions.length} permission{permissions.length !== 1 ? 's' : ''}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-[#362981]"
                    onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                  >
                    {isExpanded ? 'Masquer' : 'Voir les permissions'}
                    <ChevronDown
                      className={`ml-1 h-3.5 w-3.5 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </Button>
                </div>

                {/* Expanded permissions */}
                {isExpanded && (
                  <div className="mt-3 space-y-3 max-h-64 overflow-y-auto pr-1">
                    {Object.keys(grouped).length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        Aucune permission configurée
                      </p>
                    ) : (
                      Object.entries(grouped).map(([group, perms]) => {
                        const groupInfo = PERMISSION_GROUPS[group]
                        return (
                          <div key={group}>
                            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                              <span>{groupInfo?.icon || '🔑'}</span>
                              {groupInfo?.label || group}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {perms.map((perm) => (
                                <Badge
                                  key={`${group}.${perm}`}
                                  variant="outline"
                                  className="text-[11px] font-normal px-2 py-0"
                                >
                                  {perm}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// ── SECTION 3: SYSTEM ──
// ═══════════════════════════════════════════════

function SystemSection() {
  const [userCount, setUserCount] = useState<number | null>(null)

  useEffect(() => {
    api
      .get<{ total: number }>('/api/users', { limit: '1', page: '1' })
      .then((res) => setUserCount(res.total ?? null))
      .catch(() => {})
  }, [])

  const infoItems = [
    {
      icon: Monitor,
      label: 'Application',
      value: 'RH-AFWASA v3.0',
      color: 'text-[#362981]',
      bg: 'bg-[#362981]/10',
    },
    {
      icon: Server,
      label: 'Framework',
      value: 'Next.js 16 + TypeScript',
      color: 'text-[#029CB1]',
      bg: 'bg-[#029CB1]/10',
    },
    {
      icon: Database,
      label: 'Base de données',
      value: 'PostgreSQL (Neon)',
      color: 'text-[#009446]',
      bg: 'bg-[#009446]/10',
    },
    {
      icon: Calendar,
      label: 'Dernier seed',
      value: new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      color: 'text-amber-600',
      bg: 'bg-amber-100 dark:bg-amber-950/30',
    },
    {
      icon: Users,
      label: "Nombre d'employés",
      value: '35',
      color: 'text-[#362981]',
      bg: 'bg-[#362981]/10',
    },
    {
      icon: Users,
      label: "Nombre d'utilisateurs",
      value: userCount !== null ? String(userCount) : '—',
      color: 'text-[#029CB1]',
      bg: 'bg-[#029CB1]/10',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-lg font-semibold">Informations Système</h2>
        <p className="text-sm text-muted-foreground">
          Détails techniques et maintenance
        </p>
      </div>

      {/* Info Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {infoItems.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.bg}`}>
                  <Icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-semibold truncate">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Separator />

      {/* Special Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Fantomas Info */}
        <Card className="border-[#029CB1]/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#029CB1]/10">
                <Ghost className="h-4 w-4 text-[#029CB1]" />
              </div>
              <CardTitle className="text-sm">Compte Fantôme (Fantomas)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Le compte <span className="font-mono text-[#029CB1]">fantomas@afwasa.org</span> est un
              compte système géré automatiquement. Il ne peut pas être supprimé, désactivé ou
              modifié manuellement. Ce compte est utilisé pour les opérations d&apos;arrière-plan du
              système.
            </p>
          </CardContent>
        </Card>

        {/* Maintenance Actions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-sm">Maintenance</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled
                className="flex-1 justify-start text-muted-foreground"
              >
                <Download className="mr-2 h-4 w-4" />
                Exporter les données
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled
                className="flex-1 justify-start text-muted-foreground"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Purger le cache
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground/60">
              Ces fonctionnalités seront disponibles dans une prochaine version.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}