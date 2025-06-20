import bcrypt from 'bcrypt';
export const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

export class EncryptService {
  passwordHash(pass) {
    return bcrypt.hashSync(pass, 10)
  }
  passwordCheck(pass, hash) {
    return bcrypt.compareSync(pass, hash)
  }
};