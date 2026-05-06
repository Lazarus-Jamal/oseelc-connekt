import { PrismaClient, Role, FacilityType, DeclarationPeriodType } from '../generated'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Organisation principale
  const org = await prisma.organization.upsert({
    where: { id: 'org-oeuvre-sante' },
    update: {},
    create: {
      id: 'org-oeuvre-sante',
      name: "L'Oeuvre de Santé",
      description: 'Organisation sanitaire nationale',
      email: 'contact@oeuvre-sante.org',
    },
  })

  // Trois régions sanitaires
  const regions = await Promise.all([
    prisma.region.upsert({
      where: { code: 'RS-NORD' },
      update: {},
      create: { name: 'Région Sanitaire Nord', code: 'RS-NORD', organizationId: org.id },
    }),
    prisma.region.upsert({
      where: { code: 'RS-CENTRE' },
      update: {},
      create: { name: 'Région Sanitaire Centre', code: 'RS-CENTRE', organizationId: org.id },
    }),
    prisma.region.upsert({
      where: { code: 'RS-SUD' },
      update: {},
      create: { name: 'Région Sanitaire Sud', code: 'RS-SUD', organizationId: org.id },
    }),
  ])

  // Centres de santé et hôpitaux d'exemple
  const facilities = await Promise.all([
    prisma.facility.upsert({
      where: { code: 'HOP-NORD-01' },
      update: {},
      create: {
        name: 'Hôpital Régional Nord',
        code: 'HOP-NORD-01',
        type: FacilityType.HOSPITAL,
        regionId: regions[0].id,
      },
    }),
    prisma.facility.upsert({
      where: { code: 'CS-NORD-01' },
      update: {},
      create: {
        name: 'Centre de Santé Alpha',
        code: 'CS-NORD-01',
        type: FacilityType.HEALTH_CENTER,
        regionId: regions[0].id,
      },
    }),
    prisma.facility.upsert({
      where: { code: 'HOP-CENTRE-01' },
      update: {},
      create: {
        name: 'Hôpital Régional Centre',
        code: 'HOP-CENTRE-01',
        type: FacilityType.HOSPITAL,
        regionId: regions[1].id,
      },
    }),
  ])

  // Configuration de période par défaut (journalière)
  await prisma.declarationPeriodConfig.upsert({
    where: { id: 'config-global' },
    update: {},
    create: {
      id: 'config-global',
      periodType: DeclarationPeriodType.DAILY,
      isGlobal: true,
      deadline: 3,
    },
  })

  // Utilisateurs de démonstration
  const passwordHash = await bcrypt.hash('Admin@2024!', 12)

  const users = [
    {
      id: 'user-admin',
      email: 'admin@care-connekt.org',
      name: 'Administrateur Système',
      role: Role.SUPER_ADMIN,
      organizationId: org.id,
    },
    {
      id: 'user-direction',
      email: 'direction@oeuvre-sante.org',
      name: 'Directeur Général',
      role: Role.DIRECTION,
      organizationId: org.id,
    },
    {
      id: 'user-dr-nord',
      email: 'dr.nord@oeuvre-sante.org',
      name: 'Directeur Régional Nord',
      role: Role.REGIONAL_DIRECTOR,
      regionId: regions[0].id,
    },
    {
      id: 'user-chef-hop-nord',
      email: 'chef.hop.nord@oeuvre-sante.org',
      name: 'Dr. Chef Hôpital Nord',
      role: Role.FACILITY_CHIEF,
      facilityId: facilities[0].id,
    },
    {
      id: 'user-financier-hop-nord',
      email: 'financier.hop.nord@oeuvre-sante.org',
      name: 'Financier Hôpital Nord',
      role: Role.FINANCIER,
      facilityId: facilities[0].id,
    },
    {
      id: 'user-data-hop-nord',
      email: 'data.hop.nord@oeuvre-sante.org',
      name: 'Data Manager Hôpital Nord',
      role: Role.DATA_MANAGER,
      facilityId: facilities[0].id,
    },
  ]

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash },
    })
  }

  console.log('✅ Seed terminé avec succès')
  console.log('📧 Comptes de démonstration :')
  console.log('   admin@care-connekt.org / Admin@2024!')
  console.log('   direction@oeuvre-sante.org / Admin@2024!')
  console.log('   financier.hop.nord@oeuvre-sante.org / Admin@2024!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
