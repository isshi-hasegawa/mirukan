export function getAppRootElement(documentRef: Document = document) {
  const existingRoot = documentRef.getElementById("app");
  if (existingRoot) {
    return existingRoot;
  }

  const fallbackRoot = documentRef.createElement("div");
  fallbackRoot.id = "app";
  documentRef.body.prepend(fallbackRoot);
  return fallbackRoot;
}
