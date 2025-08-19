import { prisma } from '../lib/prisma.js'

// Get all assets (public endpoint)
export const getPublicAssets = async (req, res) => {
  try {
    const assets = await prisma.asset.findMany({
      orderBy: { createdAt: 'desc' }
    })
    res.json(assets)
  } catch (error) {
    console.error('Error fetching public assets:', error)
    res.status(500).json({ error: 'Failed to fetch assets' })
  }
}

// Get all assets (admin only)
export const getAssets = async (req, res) => {
  try {
    const assets = await prisma.asset.findMany({
      orderBy: { createdAt: 'desc' }
    })
    res.json(assets)
  } catch (error) {
    console.error('Error fetching assets:', error)
    res.status(500).json({ error: 'Failed to fetch assets' })
  }
}

// Create a new asset
export const createAsset = async (req, res) => {
  try {
    const { name, url } = req.body

    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' })
    }

    const asset = await prisma.asset.create({
      data: { name, url }
    })

    res.status(201).json(asset)
  } catch (error) {
    console.error('Error creating asset:', error)
    res.status(500).json({ error: 'Failed to create asset' })
  }
}

// Update an asset
export const updateAsset = async (req, res) => {
  try {
    const { id } = req.params
    const { name, url } = req.body

    const asset = await prisma.asset.update({
      where: { id },
      data: { name, url }
    })

    res.json(asset)
  } catch (error) {
    console.error('Error updating asset:', error)
    res.status(500).json({ error: 'Failed to update asset' })
  }
}

// Delete an asset
export const deleteAsset = async (req, res) => {
  try {
    const { id } = req.params

    await prisma.asset.delete({
      where: { id }
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting asset:', error)
    res.status(500).json({ error: 'Failed to delete asset' })
  }
}
