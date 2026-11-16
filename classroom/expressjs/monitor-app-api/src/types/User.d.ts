export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

export interface UserInput {
  name?: string;
  email?: string;
  password?: string;
}
