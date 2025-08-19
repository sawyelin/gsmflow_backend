import { prisma } from '../lib/prisma.js'

// Ensure page assets record exists
const ensurePageAssets = async () => {
  let pageAssets = await prisma.pageAssets.findFirst()
  if (!pageAssets) {
    pageAssets = await prisma.pageAssets.create({
      data: {
        loginPageImage: null,
        registerPageImage: null,
        resetPageImage: null
      }
    })
  }
  return pageAssets
}

// Get public page assets
export const getPublicPageAssets = async (req, res) => {
  try {
    const pageAssets = await ensurePageAssets()
    res.json(pageAssets)
  } catch (error) {
    console.error('Error fetching public page assets:', error)
    res.status(500).json({ error: 'Failed to fetch page assets' })
  }
}

// Get site settings (public endpoint)
export const getPublicSiteSettings = async (req, res) => {
  try {
    // Get the first (and only) site settings record
    let settings = await prisma.siteSettings.findFirst()

    // If no settings exist, create default settings
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: {
          siteName: 'GSMFlow',
          description: 'Professional Unlocking Services',
          defaultTheme: 'light'
        }
      })
    }

    // Ensure page assets record exists
    const pageAssets = await ensurePageAssets()

    // Return only public fields
    res.json({
      siteName: settings.siteName,
      logoUrl: settings.logoUrl,
      description: settings.description,
      defaultTheme: settings.defaultTheme,
      pageAssets: {
        loginPageImage: pageAssets.loginPageImage,
        registerPageImage: pageAssets.registerPageImage,
        resetPageImage: pageAssets.resetPageImage
      }
    })
  } catch (error) {
    console.error('Error fetching public site settings:', error)
    res.status(500).json({ error: 'Failed to fetch site settings' })
  }
}

// Get site settings (admin only)
export const getSiteSettings = async (req, res) => {
  try {
    // Get the first (and only) site settings record
    let settings = await prisma.siteSettings.findFirst()

    // If no settings exist, create default settings
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: {
          siteName: 'GSMFlow',
          description: 'Professional Unlocking Services',
          defaultTheme: 'light'
        }
      })
    }

    // Ensure page assets record exists
    const pageAssets = await ensurePageAssets()

    res.json({
      ...settings,
      pageAssets
    })
  } catch (error) {
    console.error('Error fetching site settings:', error)
    res.status(500).json({ error: 'Failed to fetch site settings' })
  }
}

// Update site settings
export const updateSiteSettings = async (req, res) => {
  try {
    const { siteName, logoUrl, description, defaultTheme, pageAssets } = req.body

    // Get the first (and only) site settings record
    let settings = await prisma.siteSettings.findFirst()

    // If no settings exist, create new settings
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: {
          siteName: siteName || 'GSMFlow',
          logoUrl: logoUrl || null,
          description: description || 'Professional Unlocking Services',
          defaultTheme: defaultTheme || 'light'
        }
      })
    } else {
      // Update existing settings
      settings = await prisma.siteSettings.update({
        where: { id: settings.id },
        data: {
          siteName: siteName || settings.siteName,
          logoUrl: logoUrl !== undefined ? logoUrl : settings.logoUrl,
          description: description !== undefined ? description : settings.description,
          defaultTheme: defaultTheme || settings.defaultTheme
        }
      })
    }

    // Ensure page assets record exists
    let pageAssetsRecord = await ensurePageAssets()

    // Update page assets if provided
    if (pageAssets) {
      pageAssetsRecord = await prisma.pageAssets.update({
        where: { id: pageAssetsRecord.id },
        data: {
          loginPageImage: pageAssets.loginPageImage !== undefined ? pageAssets.loginPageImage : pageAssetsRecord.loginPageImage,
          registerPageImage: pageAssets.registerPageImage !== undefined ? pageAssets.registerPageImage : pageAssetsRecord.registerPageImage,
          resetPageImage: pageAssets.resetPageImage !== undefined ? pageAssets.resetPageImage : pageAssetsRecord.resetPageImage
        }
      })
    }

    res.json({
      ...settings,
      pageAssets: pageAssetsRecord
    })
  } catch (error) {
    console.error('Error updating site settings:', error)
    res.status(500).json({ error: 'Failed to update site settings' })
  }
}
