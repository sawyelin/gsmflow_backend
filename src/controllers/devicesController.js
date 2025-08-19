import { prisma } from '../lib/prisma.js'

const upsertDevice = async (userId, imei, update) => {
  const existing = await prisma.device.findUnique({ where: { imei } })
  if (existing) {
    return prisma.device.update({ where: { id: existing.id }, data: { ...update, lastChecked: new Date() } })
  }
  return prisma.device.create({ data: { userId, imei, model: update.model || '', brand: update.brand || '', status: update.status || null, lastChecked: new Date(), iCloudStatus: update.iCloudStatus || null, samsungKGStatus: update.samsungKGStatus || null, miCloudStatus: update.miCloudStatus || null } })
}

export const history = async (req, res) => {
  const devices = await prisma.device.findMany({ where: { userId: req.user.id }, orderBy: { lastChecked: 'desc' } })
  res.json(devices)
}

export const checkIcloud = async (req, res) => {
  const { imei } = req.body
  if (!imei) return res.status(400).json({ error: 'IMEI required' })
  const device = await upsertDevice(req.user.id, imei, { iCloudStatus: 'unknown', status: 'unknown' })
  res.json({ id: device.id, imei: device.imei, status: 'unknown', lastChecked: device.lastChecked })
}

export const checkSamsungKg = async (req, res) => {
  const { imei } = req.body
  if (!imei) return res.status(400).json({ error: 'IMEI required' })
  const device = await upsertDevice(req.user.id, imei, { samsungKGStatus: 'unknown', status: 'unknown' })
  res.json({ id: device.id, imei: device.imei, status: 'unknown', lastChecked: device.lastChecked })
}

export const checkSamsungInfo = async (req, res) => {
  const { imei } = req.body
  if (!imei) return res.status(400).json({ error: 'IMEI required' })
  const device = await upsertDevice(req.user.id, imei, { status: 'unknown' })
  res.json({ id: device.id, imei: device.imei, status: 'unknown', lastChecked: device.lastChecked })
}

export const checkMiCloud = async (req, res) => {
  const { imei } = req.body
  if (!imei) return res.status(400).json({ error: 'IMEI required' })
  const device = await upsertDevice(req.user.id, imei, { miCloudStatus: 'unknown', status: 'unknown' })
  res.json({ id: device.id, imei: device.imei, status: 'unknown', lastChecked: device.lastChecked })
}
