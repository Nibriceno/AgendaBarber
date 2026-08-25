export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_REQUIREMENTS_MESSAGE =
  "La contraseña debe tener al menos 8 caracteres, una letra mayúscula y un número.";

export function getPasswordChecks(password: string) {
  return [
    {
      label: "8 caracteres",
      valid: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      label: "Una mayúscula",
      valid: /[A-Z]/.test(password),
    },
    {
      label: "Un número",
      valid: /\d/.test(password),
    },
  ];
}

export function isPasswordValid(password: string): boolean {
  return getPasswordChecks(password).every((check) => check.valid);
}
