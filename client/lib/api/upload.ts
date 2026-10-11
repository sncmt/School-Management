import { httpClient } from "./httpClient";
import type { ApiResponse } from "./types";

/**
 * PUTs one file in the "file" field. The multipart header stops axios turning
 * the FormData into JSON (the client's default type); the browser then sets
 * the real header with its boundary.
 */
export const uploadFile = async <T>(url: string, file: File, onProgress?: (percent: number) => void) => {
  const body = new FormData();
  body.append("file", file);
  const response = await httpClient.put<ApiResponse<T>>(url, body, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (event) => {
      if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
  return response.data.data;
};
