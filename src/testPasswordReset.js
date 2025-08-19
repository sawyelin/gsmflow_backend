import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testPasswordReset () {
  try {
    // Get the user with reset token
    const user = await prisma.user.findUnique({
      where: {
        email: 'yaelintun2022@gmail.com'
      },
      select: {
        id: true,
        email: true,
        resetPasswordToken: true,
        resetPasswordExpires: true
      }
    })

    if (!user) {
      console.log('User not found')
      return
    }

    console.log('User:', user)
    console.log('Current time:', new Date())

    // Check if token is valid
    if (!user.resetPasswordToken) {
      console.log('No reset token found for user')
      return
    }

    if (!user.resetPasswordExpires) {
      console.log('No reset token expiration found for user')
      return
    }

    if (user.resetPasswordExpires < new Date()) {
      console.log('Reset token has expired')
      return
    }

    console.log('Reset token is valid')

    await prisma.$disconnect()
  } catch (error) {
    console.error('Error testing password reset:', error)
    await prisma.$disconnect()
  }
}

testPasswordReset()
