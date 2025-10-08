import { useCallback, useMemo, useState } from 'react';
import { validateBeforeUpload, generateFilePreview, type FilePreview } from '../utils/fileHandlers';

type UploadOptions = {
  allowedTypes: string[];
  maxBytes: number;
};

export function useFileUpload(options: UploadOptions) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<FilePreview[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState<number>(0);

  const onDrop = useCallback((incoming: FileList | File[]) => {
    const list = Array.isArray(incoming) ? incoming : Array.from(incoming);
    const oks: File[] = [];
    const errs: string[] = [];
    const pv: FilePreview[] = [];
    list.forEach((f) => {
      const err = validateBeforeUpload(f, options.allowedTypes, options.maxBytes);
      if (err) errs.push(`${f.name}: ${err}`);
      else {
        oks.push(f);
        pv.push(generateFilePreview(f));
      }
    });
    setFiles(oks);
    setPreviews((prev) => {
      prev.forEach((p) => p.revoke());
      return pv;
    });
    setErrors(errs);
  }, [options.allowedTypes, options.maxBytes]);

  const reset = useCallback(() => {
    setFiles([]);
    setErrors([]);
    setProgress(0);
    setPreviews((prev) => { prev.forEach((p) => p.revoke()); return []; });
  }, []);

  const hasErrors = useMemo(() => errors.length > 0, [errors]);

  return { files, previews, errors, hasErrors, progress, setProgress, onDrop, reset } as const;
}


