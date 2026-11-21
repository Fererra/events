/** Port: one-way password hashing (Argon2 in infrastructure). */
export interface IPasswordHasher {
  hash(plain: string): Promise<string>;
  verify(hash: string, plain: string): Promise<boolean>;
}
