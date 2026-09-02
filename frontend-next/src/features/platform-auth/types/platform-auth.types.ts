export type PlatformRole = "SUPER_ADMIN";

export type PlatformUser = {
  id: number;
  role: PlatformRole;
  firstName: string;
  lastName: string;
  email: string;
};

export type PlatformLoginInput = {
  email: string;
  password: string;
};

export type PlatformLoginResponse = {
  user: PlatformUser;
  csrfToken: string;
};
