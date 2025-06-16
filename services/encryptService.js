import bcrypt from 'bcrypt';

export class EncryptService {
    passwordHash(pass) {
        return bcrypt.hashSync(pass, 10)
    }
    passwordCheck(pass, hash) {
        return bcrypt.compareSync(pass,hash)
    }
} 