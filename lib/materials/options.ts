export const supportedMaterialTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
] as const;

export const supportedMaterialExtensions = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".zip"];

export const maxMaterialSizeBytes = 20 * 1024 * 1024;

export function isSupportedMaterial(file: File) {
  const lowerName = file.name.toLowerCase();
  return (
    supportedMaterialTypes.includes(
      file.type as (typeof supportedMaterialTypes)[number],
    ) ||
    supportedMaterialExtensions.some((extension) => lowerName.endsWith(extension))
  );
}

export function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}
