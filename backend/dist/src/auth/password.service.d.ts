export declare class PasswordService {
    hash(password: string): string;
    verify(password: string, storedHash: string): boolean;
}
