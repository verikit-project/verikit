// Loads .env when there is one, using Node's built-in loader. Variables
// already set in the environment win over the file.
try {
  process.loadEnvFile();
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
    throw error;
  }
}
