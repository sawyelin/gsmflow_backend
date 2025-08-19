import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testResetToken() {
  try {
    // Check if there are any users with reset tokens
    const usersWithTokens = await prisma.user.findMany({
      where: {
        resetPasswordToken: {
          not: null
        }
      },
      select: {
        id: true,
        email: true,
        resetPasswordToken: true,
        resetPasswordExpires: true
      }
    });
    
    console.log('Users with reset tokens:', usersWithTokens);
    
    // If there are users with tokens, check if any are valid
    if (usersWithTokens.length > 0) {
      const now = new Date();
      const validTokens = usersWithTokens.filter(user => 
        user.resetPasswordExpires && user.resetPasswordExpires > now
      );
      
      console.log('Users with valid reset tokens:', validTokens);
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error checking reset tokens:', error);
    await prisma.$disconnect();
  }
}

testResetToken();
