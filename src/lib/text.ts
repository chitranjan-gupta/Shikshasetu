export const handleCopy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err: unknown) {
    console.log(err);
    return false;
  }
};

export const camelCase = (text: string) => {
  return text.replace(text.charAt(0), text.charAt(0).toUpperCase());
};

function replaceAllOccurrences(str: string, search: string) {
  return str.replace(new RegExp(search, 'g'), ' ');
}

export function getDomain(url: string): string {
  return new URL(url).hostname;
}

export const normalizeText = (text: string) => {
  return replaceAllOccurrences(camelCase(text), '_');
};

export function saveData(key: string, value: unknown) {
  const data: Record<string, unknown> = {};
  data[key] = value;
  chrome.storage.local.set(data, function () {
    console.log('Data saved:', key, value);
  });
}

export function generateRandomString(
  length: number,
  charSet: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+'
) {
  let result = '';
  const charactersLength = charSet.length;
  for (let i = 0; i < length; i++) {
    result += charSet.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export function generateRandomEmail() {
  const usernameLength = 10;
  const username = generateRandomString(
    usernameLength,
    'abcdefghijklmnopqrstuvwxyz0123456789'
  );
  const domains = ['example.com', 'test.com', 'random.com', 'mail.com'];
  const randomDomain = domains[Math.floor(Math.random() * domains.length)];
  return `${username}@${randomDomain}`;
}

export function generateRandomPassword() {
  const passwordLength = 12;
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const specialChars = '!@#$%^&*()_+';
  const password = [
    generateRandomString(1, lowercase),
    generateRandomString(1, uppercase),
    generateRandomString(1, digits),
    generateRandomString(1, specialChars),
  ].join('');
  const remainingLength = passwordLength - password.length;
  const allChars = lowercase + uppercase + digits + specialChars;
  return password + generateRandomString(remainingLength, allChars);
}

export function sanitize(value: string) {
  return value.trim().toLowerCase();
}
