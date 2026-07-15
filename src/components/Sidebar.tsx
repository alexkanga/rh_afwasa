'use client'

import Image from 'next/image'
import {
  LayoutDashboard,
  Users,
  FileText,
  Wallet,
  Calculator,
  Settings,
  LogOut,
  Shield,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { useAppStore } from '@/stores'

interface NavItem {
  label: string
  page: string
  icon: LucideIcon
}

const mainNavItems: NavItem[] = [
  { label: 'Tableau de bord', page: 'dashboard', icon: LayoutDashboard },
  { label: 'Employés', page: 'employees', icon: Users },
  { label: 'Contrats', page: 'contracts', icon: FileText },
  { label: 'Profils salariaux', page: 'salary-profiles', icon: Wallet },
  { label: 'Paie', page: 'payroll', icon: Calculator },
]

const secondaryNavItems: NavItem[] = [
  { label: 'Départs', page: 'departures', icon: LogOut },
  { label: 'Audit', page: 'audit', icon: Shield },
  { label: 'Simulateur', page: 'simulator', icon: TrendingUp },
]

const settingsItem: NavItem = { label: 'Paramètres', page: 'settings', icon: Settings }

export default function AppSidebar() {
  const currentPage = useAppStore((s) => s.currentPage)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)

  const handleNav = (page: string) => {
    setCurrentPage(page)
  }

  return (
    <Sidebar collapsible="icon">
      {/* Header with logo */}
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center">
            <Image
              src="/logo_aaea.jpg"
              alt="AFWASA"
              width={40}
              height={40}
              className="h-10 w-auto object-contain"
            />
          </div>
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-bold tracking-tight text-sidebar-foreground">
              RH-AFWASA
            </span>
            <span className="truncate text-[10px] text-sidebar-foreground/60">
              Gestion RH & Paie
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.page}>
                  <SidebarMenuButton
                    isActive={currentPage === item.page}
                    onClick={() => handleNav(item.page)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Secondary navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNavItems.map((item) => (
                <SidebarMenuItem key={item.page}>
                  <SidebarMenuButton
                    isActive={currentPage === item.page}
                    onClick={() => handleNav(item.page)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Settings at bottom */}
      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={currentPage === settingsItem.page}
              onClick={() => handleNav(settingsItem.page)}
              tooltip={settingsItem.label}
            >
              <settingsItem.icon className="h-4 w-4" />
              <span>{settingsItem.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-4 pb-2 group-data-[collapsible=icon]:hidden">
          <p className="text-[10px] text-sidebar-foreground/40">© 2025 AFWASA</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}