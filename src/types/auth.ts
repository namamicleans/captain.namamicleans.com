export interface UserResponse {
  user: {
    id: number; // AutoField - never null
    name: string | null; // CharField null=True
    email: string | null; // EmailField null=True
    role: string; // ForeignKey null=True (returns role.name)
    phone_number: string | null; // CharField null=True
    is_active: boolean; // BooleanField default=True - never null
  };
  tokens: {
    access: string;
    refresh: string;
  };
}
