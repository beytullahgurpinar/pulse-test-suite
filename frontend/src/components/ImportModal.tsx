import { useState, useRef, useCallback } from 'react';
import {
  Modal,
  ModalDialog,
  ModalClose,
  Typography,
  Box,
  Button,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Select,
  Option,
  Sheet,
  Table,
  Chip,
  Divider,
  Alert,
} from '@mui/joy';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import type { Category } from '../types';
import { api } from '../api';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: number;
  categories: Category[];
  onImported: () => void;
}

type ParsedItem = { name: string; method: string; url: string; categoryName?: string };
type Step = 'upload' | 'preview' | 'done';

const METHOD_COLORS: Record<string, 'success' | 'primary' | 'warning' | 'danger' | 'neutral'> = {
  GET: 'success', POST: 'primary', PUT: 'warning', PATCH: 'warning', DELETE: 'danger',
};

export function ImportModal({ open, onClose, projectId, categories, onImported }: Props) {
  const [tab, setTab] = useState<number>(0); // 0=Postman, 1=OpenAPI
  const [step, setStep] = useState<Step>('upload');
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [updatedCount, setUpdatedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('upload');
    setContent('');
    setFileName('');
    setParsedItems([]);
    setCategoryId(null);
    setError('');
    setImportedCount(0);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setContent(e.target?.result as string ?? '');
    reader.readAsText(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleParse = async () => {
    if (!content.trim()) { setError('Please upload a file or paste content'); return; }
    setError('');
    setParsing(true);
    try {
      const fn = tab === 0 ? api.importPostman : api.importOpenAPI;
      const res = await fn({ projectId, content, dryRun: true });
      setParsedItems(res.items ?? []);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Failed to parse');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setError('');
    try {
      const fn = tab === 0 ? api.importPostman : api.importOpenAPI;
      const res = await fn({ projectId, categoryId: categoryId || null, content, dryRun: false });
      setImportedCount(res.imported ?? 0);
      setUpdatedCount(res.updated ?? 0);
      setSkippedCount(res.skipped ?? 0);
      setStep('done');
      onImported();
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ModalDialog
        layout="center"
        sx={{ width: { xs: '95vw', sm: 600 }, maxHeight: '85vh', display: 'flex', flexDirection: 'column', borderRadius: 'xl', p: 0, overflow: 'hidden' }}
      >
        <ModalClose sx={{ top: 14, right: 14, zIndex: 10 }} />

        {/* Header */}
        <Box sx={{ p: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            {step === 'preview' && (
              <Button
                variant="plain" color="neutral" size="sm"
                startDecorator={<ArrowBackRoundedIcon />}
                onClick={() => setStep('upload')}
                sx={{ mr: 0.5, px: 1 }}
              >
                Back
              </Button>
            )}
            <Typography level="title-lg" fontWeight={700}>
              {step === 'upload' && 'Import Tests'}
              {step === 'preview' && `Preview — ${parsedItems.length} endpoints found`}
              {step === 'done' && 'Import Complete'}
            </Typography>
          </Box>
          {step === 'upload' && (
            <Typography level="body-sm" textColor="neutral.500">
              Import tests from a Postman collection or OpenAPI / Swagger spec
            </Typography>
          )}
        </Box>

        {/* Body */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>

          {/* ── Step: Upload ── */}
          {step === 'upload' && (
            <>
              <Tabs value={tab} onChange={(_, v) => { setTab(v as number); setContent(''); setFileName(''); setError(''); }} sx={{ mb: 3 }}>
                <TabList sx={{ borderRadius: 'lg' }}>
                  <Tab value={0}>Postman Collection</Tab>
                  <Tab value={1}>OpenAPI / Swagger</Tab>
                </TabList>
                <TabPanel value={0} sx={{ px: 0, pt: 2 }}>
                  <Typography level="body-sm" textColor="neutral.500">
                    Export your collection from Postman: Collection → ⋯ → Export → Collection v2.1 (JSON)
                  </Typography>
                </TabPanel>
                <TabPanel value={1} sx={{ px: 0, pt: 2 }}>
                  <Typography level="body-sm" textColor="neutral.500">
                    Supports OpenAPI 3.x and Swagger 2.x in JSON or YAML format
                  </Typography>
                </TabPanel>
              </Tabs>

              {/* Drop zone */}
              <Sheet
                variant="outlined"
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  borderRadius: 'xl',
                  border: '2px dashed',
                  borderColor: isDragging ? 'primary.400' : content ? 'success.400' : 'divider',
                  bgcolor: isDragging ? 'primary.softBg' : content ? 'success.softBg' : 'background.level1',
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  '&:hover': { borderColor: 'primary.300', bgcolor: 'primary.softBg' },
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.yaml,.yml"
                  style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                {content ? (
                  <>
                    <CheckCircleRoundedIcon sx={{ fontSize: 36, color: 'success.500', mb: 1 }} />
                    <Typography level="body-md" fontWeight={600}>{fileName || 'File loaded'}</Typography>
                    <Typography level="body-sm" textColor="neutral.500">Click to replace</Typography>
                  </>
                ) : (
                  <>
                    <UploadFileRoundedIcon sx={{ fontSize: 36, color: 'neutral.400', mb: 1 }} />
                    <Typography level="body-md" fontWeight={600}>Drop file here or click to browse</Typography>
                    <Typography level="body-sm" textColor="neutral.500">
                      {tab === 0 ? '.json' : '.json, .yaml, .yml'}
                    </Typography>
                  </>
                )}
              </Sheet>

              {/* Paste hint */}
              <Typography level="body-xs" textColor="neutral.400" sx={{ textAlign: 'center', mt: 1.5 }}>
                or paste JSON / YAML below
              </Typography>
              <textarea
                value={content}
                onChange={(e) => { setContent(e.target.value); setFileName(''); }}
                placeholder={tab === 0 ? '{ "info": {...}, "item": [...] }' : 'openapi: "3.0.0"\npaths:\n  /users:\n    get: ...'}
                style={{
                  width: '100%', marginTop: 8, height: 90, padding: '10px 12px',
                  border: '1px solid var(--joy-palette-divider)',
                  borderRadius: 8, fontFamily: 'monospace', fontSize: 12,
                  background: 'var(--joy-palette-background-level1)',
                  color: 'var(--joy-palette-text-primary)',
                  resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </>
          )}

          {/* ── Step: Preview ── */}
          {step === 'preview' && (
            <>
              {/* Category info + fallback selector */}
              <Box sx={{ mb: 3, p: 2, bgcolor: 'background.level1', borderRadius: 'lg' }}>
                <Typography level="body-sm" fontWeight={600} sx={{ mb: 1 }}>
                  Categories
                </Typography>
                {parsedItems.some(i => i.categoryName) ? (
                  <Typography level="body-sm" textColor="success.600" sx={{ mb: 1.5 }}>
                    Folders / tags detected — categories will be created automatically if they don't exist.
                  </Typography>
                ) : null}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography level="body-xs" textColor="neutral.500" sx={{ whiteSpace: 'nowrap' }}>
                    Fallback for uncategorized:
                  </Typography>
                  <Select
                    placeholder="No category"
                    value={categoryId}
                    onChange={(_, v) => setCategoryId(v as number | null)}
                    size="sm"
                    sx={{ flex: 1 }}
                  >
                    <Option value={null}>No category</Option>
                    {categories.map(cat => (
                      <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                    ))}
                  </Select>
                </Box>
              </Box>

              {/* Preview table */}
              {parsedItems.length === 0 ? (
                <Sheet variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 'xl' }}>
                  <Typography level="body-md" textColor="neutral.500">No endpoints found in this file</Typography>
                </Sheet>
              ) : (
                <Sheet variant="outlined" sx={{ borderRadius: 'xl', overflow: 'hidden' }}>
                  <Table size="sm" stickyHeader sx={{ '& th': { bgcolor: 'background.level1', fontWeight: 700 } }}>
                    <thead>
                      <tr>
                        <th style={{ width: 70 }}>Method</th>
                        <th>Name</th>
                        <th style={{ width: 110 }}>Category</th>
                        <th>URL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedItems.map((item, i) => (
                        <tr key={i}>
                          <td>
                            <Chip
                              size="sm"
                              color={METHOD_COLORS[item.method] ?? 'neutral'}
                              variant="soft"
                              sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.7rem' }}
                            >
                              {item.method}
                            </Chip>
                          </td>
                          <td>
                            <Typography level="body-sm" fontWeight={600}>{item.name}</Typography>
                          </td>
                          <td>
                            {item.categoryName ? (
                              <Chip size="sm" variant="soft" color="neutral" sx={{ fontSize: '0.7rem' }}>
                                {item.categoryName}
                              </Chip>
                            ) : (
                              <Typography level="body-xs" textColor="neutral.400">—</Typography>
                            )}
                          </td>
                          <td>
                            <Typography
                              level="body-xs"
                              fontFamily="monospace"
                              textColor="neutral.500"
                              sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {item.url}
                            </Typography>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Sheet>
              )}
            </>
          )}

          {/* ── Step: Done ── */}
          {step === 'done' && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <CheckCircleRoundedIcon sx={{ fontSize: 56, color: 'success.500', mb: 2 }} />
              <Typography level="h3" fontWeight={800} sx={{ mb: 2 }}>
                Done!
              </Typography>
              <Box sx={{ display: 'inline-flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                {importedCount > 0 && (
                  <Chip color="success" variant="soft" size="lg">{importedCount} created</Chip>
                )}
                {updatedCount > 0 && (
                  <Chip color="primary" variant="soft" size="lg">{updatedCount} assigned to category</Chip>
                )}
                {skippedCount > 0 && (
                  <Chip color="neutral" variant="soft" size="lg">{skippedCount} already exist</Chip>
                )}
              </Box>
            </Box>
          )}

          {error && (
            <Alert color="danger" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>

        {/* Footer */}
        <Divider />
        <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
          {step === 'upload' && (
            <>
              <Button variant="outlined" color="neutral" onClick={handleClose}>Cancel</Button>
              <Button
                variant="soft" color="primary"
                onClick={handleParse}
                loading={parsing}
                disabled={!content.trim()}
              >
                Parse & Preview
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outlined" color="neutral" onClick={handleClose}>Cancel</Button>
              <Button
                variant="solid" color="primary"
                onClick={handleImport}
                loading={importing}
                disabled={parsedItems.length === 0}
              >
                Import {parsedItems.length} tests
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button variant="solid" color="primary" onClick={handleClose}>Done</Button>
          )}
        </Box>
      </ModalDialog>
    </Modal>
  );
}
