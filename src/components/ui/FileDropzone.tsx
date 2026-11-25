import React, { useCallback, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { acceptAttr, formatsHint, partitionFiles, type FileRules } from '../../lib/files.js';

interface FileDropzoneProps {
  rules: FileRules;
  multiple?: boolean;
  disabled?: boolean;
  /** Files that passed the rules. */
  onFiles: (files: File[]) => void;
  /** One plain-language message per refused file. */
  onRejected?: (messages: string[]) => void;
  children: (state: { dragging: boolean; open: () => void }) => React.ReactNode;
  className?: string;
}

/**
 * A drop target with a real file input behind it. Drag files onto it or call `open()` from any button
 * inside (so the keyboard path is a normal button). Files are checked against `rules` before anything else sees them.
 */
export const FileDropzone: React.FC<FileDropzoneProps> = ({ rules, multiple, disabled, onFiles, onRejected, children, className = '' }) => {
  const input = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);

  const take = useCallback(
    (list: FileList | File[] | null | undefined) => {
      const files = Array.from(list ?? []);
      if (!files.length || disabled) return;
      const { accepted, errors } = partitionFiles(files, rules);
      onRejected?.(errors);
      if (accepted.length) onFiles(multiple ? accepted : accepted.slice(0, 1));
    },
    [disabled, multiple, onFiles, onRejected, rules],
  );

  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

  return (
    <div
      className={className}
      onDragEnter={(e) => {
        if (!hasFiles(e) || disabled) return;
        e.preventDefault();
        depth.current++;
        setDragging(true);
      }}
      onDragOver={(e) => {
        if (!hasFiles(e) || disabled) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={() => {
        // Entering a child fires leave on the parent first; count enters and leaves so the highlight does not flicker.
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDragging(false);
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        depth.current = 0;
        setDragging(false);
        take(e.dataTransfer.files);
      }}
    >
      {children({ dragging, open: () => !disabled && input.current?.click() })}
      <input
        ref={input}
        type="file"
        hidden
        tabIndex={-1}
        multiple={multiple}
        accept={acceptAttr(rules.kinds)}
        disabled={disabled}
        onChange={(e) => {
          take(e.target.files);
          // The same file can be chosen again after it was removed.
          e.target.value = '';
        }}
      />
    </div>
  );
};

interface DropSurfaceProps {
  title: string;
  rules: FileRules;
  dragging: boolean;
  disabled?: boolean;
  onOpen: () => void;
  icon?: React.ReactNode;
  /** Replaces the default format and size line. */
  hint?: string;
  compact?: boolean;
  describedBy?: string;
}

/** The empty state: one big button that says what to drop and what is allowed. */
export const DropSurface: React.FC<DropSurfaceProps> = ({ title, rules, dragging, disabled, onOpen, icon, hint, compact, describedBy }) => {
  const limits = rules.kinds.map((k) => `${rules.maxMB?.[k] ?? { image: 25, video: 100, audio: 30 }[k]} MB`);
  const spec = hint ?? `${formatsHint(rules.kinds)} · maks. ${[...new Set(limits)].join(' / ')}`;
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      aria-describedby={describedBy}
      className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-sm border-2 border-dashed text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-55 ${
        compact ? 'px-4 py-5' : 'px-5 py-8'
      } ${dragging ? 'border-primary bg-paper-2' : 'border-field bg-card hover:border-primary/70 hover:bg-paper-2'}`}
    >
      <span className={`grid place-items-center rounded-full ${dragging ? 'bg-primary text-on-primary' : 'bg-paper-2 text-primary'} ${compact ? 'h-9 w-9' : 'h-11 w-11'}`}>
        {icon ?? <Upload className="h-5 w-5" aria-hidden="true" />}
      </span>
      <span className="text-[15px] font-semibold text-ink">{dragging ? 'Lepaskan untuk mengunggah' : title}</span>
      <span className="text-xs text-ink-soft">{spec}</span>
    </button>
  );
};
