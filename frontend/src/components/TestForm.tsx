import { useState, useEffect } from 'react';
import {
  Sheet,
  Typography,
  Input,
  Button,
  Box,
  FormControl,
  FormLabel,
  Select,
  Option,
  IconButton,
  Alert,
  CircularProgress,
  Stack,
  Tooltip,
} from '@mui/joy';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { useRef } from 'react';
import type { TestRequest, Assertion, Project, EnvVar, Category } from '../types';
import { api } from '../api';
import { JsonEditor, type JsonEditorRef } from './JsonEditor';
import { PlaceholderChips } from './PlaceholderChips';

interface Props {
  testId?: number;
  projectId?: number;
  projects: Project[];
  onSave: () => void;
  onCancel: () => void;
}

const METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const ASSERTION_TYPES = [
  { value: 'status', label: 'HTTP Status' },
  { value: 'json_path', label: 'JSON Path' },
];

const OPERATOR_OPTIONS: { value: string; label: string; needsValue: boolean }[] = [
  { value: 'eq', label: 'Equals', needsValue: true },
  { value: 'ne', label: 'Not Equals', needsValue: true },
  { value: 'contains', label: 'Contains', needsValue: true },
  { value: 'exists', label: 'Exists', needsValue: false },
  { value: 'not_exists', label: 'Not Exists', needsValue: false },
  { value: 'is_null', label: 'Is Null', needsValue: false },
  { value: 'is_not_null', label: 'Is Not Null', needsValue: false },
  { value: 'is_true', label: 'Is True', needsValue: false },
  { value: 'is_false', label: 'Is False', needsValue: false },
];

const OPERATORS_NEED_VALUE = new Set(OPERATOR_OPTIONS.filter((o) => o.needsValue).map((o) => o.value));
const QUICK_VALUES: { value: string; label: string }[] = [
  { value: 'true', label: 'true' },
  { value: 'false', label: 'false' },
  { value: 'null', label: 'null' },
  { value: '200', label: '200' },
  { value: '0', label: '0' },
];

const emptyAssertion: Assertion = {
  type: 'status',
  key: '',
  operator: 'eq',
  expectedValue: '200',
};

export function TestForm({ testId, projectId, projects, onSave, onCancel }: Props) {
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(!!testId);
  const [error, setError] = useState('');
  const [form, setForm] = useState<TestRequest>({
    projectId: projectId ?? 0,
    categoryId: null,
    name: '',
    method: 'GET',
    url: '',
    headers: {},
    body: '',
    assertions: [{ ...emptyAssertion }],
  });
  const [headersJson, setHeadersJson] = useState('{}');
  const headersEditorRef = useRef<JsonEditorRef>(null);
  const bodyEditorRef = useRef<JsonEditorRef>(null);

  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (testId) {
      api.getTest(testId).then((t) => {
        const headers = (t.headers as Record<string, string>) || {};
        setForm({
          projectId: t.projectId ?? projectId ?? 0,
          categoryId: t.categoryId ?? null,
          name: t.name,
          method: t.method || 'GET',
          url: t.url,
          headers,
          body: t.body || '',
          assertions: t.assertions?.length ? t.assertions : [{ ...emptyAssertion }],
        });
        setHeadersJson(JSON.stringify(headers, null, 2));
        setLoading(false);
        if (t.projectId) {
          api.listEnvVars(t.projectId).then(setEnvVars).catch(() => { });
          api.listCategories(t.projectId).then(setCategories).catch(() => { });
        }
      }).catch((e) => {
        setError(e.message);
        setLoading(false);
      });
    } else {
      if (projectId) {
        setForm((f) => ({ ...f, projectId }));
        api.listEnvVars(projectId).then(setEnvVars).catch(() => { });
        api.listCategories(projectId).then(setCategories).catch(() => { });
      }
    }
  }, [testId, projectId]);

  const update = (k: keyof TestRequest, v: unknown) => {
    setForm((f) => ({ ...f, [k]: v }));
  };

  const updateAssertion = (i: number, k: keyof Assertion, v: string) => {
    setForm((f) => {
      const a = [...f.assertions];
      a[i] = { ...a[i], [k]: v };
      return { ...f, assertions: a };
    });
  };

  const addAssertion = () => {
    setForm((f) => ({
      ...f,
      assertions: [...f.assertions, { ...emptyAssertion }],
    }));
  };

  const removeAssertion = (i: number) => {
    setForm((f) => ({
      ...f,
      assertions: f.assertions.filter((_, idx) => idx !== i),
    }));
  };

  const duplicateAssertion = (i: number) => {
    setForm((f) => {
      const copy = { ...f.assertions[i] };
      delete (copy as Assertion & { id?: number }).id;
      const updated = [...f.assertions];
      updated.splice(i + 1, 0, copy);
      return { ...f, assertions: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      let headers = form.headers;
      try {
        headers = JSON.parse(headersJson || '{}') as Record<string, string>;
      } catch {
        setError('Headers must be valid JSON format');
        return;
      }
      const payload = {
        ...form,
        headers,
        assertions: form.assertions.map((a) => ({
          type: a.type,
          key: a.type === 'status' ? 'status' : a.key,
          operator: a.operator,
          expectedValue: a.type === 'status' ? a.expectedValue : a.expectedValue,
        })),
      };
      if (testId) {
        await api.updateTest(testId, payload);
      } else {
        await api.createTest(payload);
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <Alert color="danger" variant="soft" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ flex: 1 }}>{error}</Box>
          <Button size="sm" variant="plain" color="danger" onClick={() => setError('')}>
            Close
          </Button>
        </Alert>
      )}

      <Sheet variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 'md' }}>
        <Typography level="title-lg" fontWeight={600} sx={{ mb: 2 }}>
          General Info
        </Typography>
        <Stack spacing={2}>
          {projects.length > 1 && (
            <FormControl>
              <FormLabel>Project</FormLabel>
              <Select
                value={String(form.projectId || '')}
                onChange={(_, v) => {
                  const newPid = v ? Number(v) : 0;
                  update('projectId', newPid);
                  update('categoryId', null); // Reset category when project changes
                  if (newPid) {
                    api.listCategories(newPid).then(setCategories).catch(() => { });
                    api.listEnvVars(newPid).then(setEnvVars).catch(() => { });
                  }
                }}
              >
                {projects.map((p) => (
                  <Option key={p.id} value={String(p.id)}>{p.name}</Option>
                ))}
              </Select>
            </FormControl>
          )}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl sx={{ flex: 1, minWidth: 200 }}>
              <FormLabel>Test Name</FormLabel>
              <Input
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="e.g. Stripe Payment API"
                required
              />
            </FormControl>
            <FormControl sx={{ flex: 1, minWidth: 200 }}>
              <FormLabel>Category</FormLabel>
              <Select
                value={form.categoryId ? String(form.categoryId) : 'none'}
                onChange={(_, v) => update('categoryId', v === 'none' ? null : Number(v))}
              >
                <Option value="none">Uncategorized</Option>
                {categories.map((c) => (
                  <Option key={c.id} value={String(c.id)}>{c.name}</Option>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 140 }}>
              <FormLabel>HTTP Method</FormLabel>
              <Select
                value={form.method}
                onChange={(_, v) => update('method', v)}
              >
                {METHOD_OPTIONS.map((m) => (
                  <Option key={m} value={m}>{m}</Option>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ flex: 1, minWidth: 200 }}>
              <FormLabel>URL</FormLabel>
              <Input
                value={form.url}
                onChange={(e) => update('url', e.target.value)}
                placeholder="https://api.example.com/endpoint"
                required
              />
            </FormControl>
          </Box>
        </Stack>
      </Sheet>

      <Sheet variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 'md' }}>
        <Typography level="title-lg" fontWeight={600} sx={{ mb: 2 }}>
          Headers (JSON)
        </Typography>
        <Typography level="body-sm" textColor="neutral.500" sx={{ mb: 1 }}>
          Example: {`{ "Authorization": "Bearer xxx", "X-Custom": "value" }`}
        </Typography>
        <PlaceholderChips envVars={envVars} onInsert={(ph) => headersEditorRef.current?.insertAtCursor(ph)} />
        <JsonEditor
          ref={headersEditorRef}
          value={headersJson}
          onChange={setHeadersJson}
          placeholder="{}"
          minHeight={180}
        />
      </Sheet>

      {(form.method === 'POST' || form.method === 'PUT' || form.method === 'PATCH') && (
        <Sheet variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 'md' }}>
          <Typography level="title-lg" fontWeight={600} sx={{ mb: 2 }}>
            Request Body (JSON)
          </Typography>
          <PlaceholderChips envVars={envVars} onInsert={(ph) => bodyEditorRef.current?.insertAtCursor(ph)} />
          <JsonEditor
            ref={bodyEditorRef}
            value={form.body}
            onChange={(v) => update('body', v)}
            placeholder='{"key": "value"}'
            minHeight={220}
          />
        </Sheet>
      )}

      <Sheet variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 'md' }}>
        <Typography level="title-lg" fontWeight={600} sx={{ mb: 2 }}>
          Expected Responses
        </Typography>
        <Typography level="body-sm" textColor="neutral.500" sx={{ mb: 2 }}>
          Define expected values via HTTP status or JSON path
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {form.assertions.map((a, i) => (
            <Sheet
              key={i}
              variant="soft"
              color="neutral"
              sx={{ p: 2, borderRadius: 'md' }}
            >
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <FormControl size="sm" sx={{ minWidth: 140 }}>
                  <FormLabel>Type</FormLabel>
                  <Select
                    value={a.type}
                    onChange={(_, v) => updateAssertion(i, 'type', v as string)}
                  >
                    {ASSERTION_TYPES.map((t) => (
                      <Option key={t.value} value={t.value}>{t.label}</Option>
                    ))}
                  </Select>
                </FormControl>

                {a.type === 'status' ? (
                  <FormControl size="sm" sx={{ minWidth: 160 }}>
                    <FormLabel>Expected Status</FormLabel>
                    <Select
                      value={/^\d{3}$/.test(a.expectedValue || '') ? a.expectedValue : '200'}
                      onChange={(_, v) => updateAssertion(i, 'expectedValue', (v as string) || '200')}
                    >
                      <Option value="200">200 OK</Option>
                      <Option value="201">201 Created</Option>
                      <Option value="204">204 No Content</Option>
                      <Option value="400">400 Bad Request</Option>
                      <Option value="401">401 Unauthorized</Option>
                      <Option value="403">403 Forbidden</Option>
                      <Option value="404">404 Not Found</Option>
                      <Option value="422">422 Unprocessable</Option>
                      <Option value="500">500 Server Error</Option>
                    </Select>
                  </FormControl>
                ) : (
                  <>
                    <FormControl size="sm" sx={{ minWidth: 200, flex: 1 }}>
                      <FormLabel>JSON Path</FormLabel>
                      <Input
                        value={a.key}
                        onChange={(e) => updateAssertion(i, 'key', e.target.value)}
                        placeholder="$.data.success"
                      />
                    </FormControl>
                    <FormControl size="sm" sx={{ minWidth: 160 }}>
                      <FormLabel>Condition</FormLabel>
                      <Select
                        value={a.operator}
                        onChange={(_, v) => updateAssertion(i, 'operator', (v as string) || 'eq')}
                      >
                        {OPERATOR_OPTIONS.map((o) => (
                          <Option key={o.value} value={o.value}>
                            {o.label}
                          </Option>
                        ))}
                      </Select>
                    </FormControl>
                    {OPERATORS_NEED_VALUE.has(a.operator) && (
                      <FormControl size="sm" sx={{ minWidth: 180 }}>
                        <FormLabel>Expected Value</FormLabel>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Input
                            value={a.expectedValue}
                            onChange={(e) => updateAssertion(i, 'expectedValue', e.target.value)}
                            placeholder="Enter value"
                          />
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {QUICK_VALUES.map((qv) => (
                              <Button
                                key={qv.value}
                                size="sm"
                                variant={a.expectedValue === qv.value ? 'soft' : 'plain'}
                                color={a.expectedValue === qv.value ? 'primary' : 'neutral'}
                                onClick={() => updateAssertion(i, 'expectedValue', qv.value)}
                                sx={{ minWidth: 'auto', px: 1.5, py: 0.5, fontSize: '0.75rem' }}
                              >
                                {qv.label}
                              </Button>
                            ))}
                          </Box>
                        </Box>
                      </FormControl>
                    )}
                  </>
                )}

                <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
                  <Tooltip title="Duplicate">
                    <IconButton size="sm" variant="plain" onClick={() => duplicateAssertion(i)}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="sm"
                      variant="plain"
                      color="danger"
                      onClick={() => removeAssertion(i)}
                      disabled={form.assertions.length === 1}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Sheet>
          ))}
        </Box>

        <Button
          variant="outlined"
          startDecorator={<AddIcon />}
          onClick={addAssertion}
          sx={{ mt: 2 }}
        >
          Add Rule
        </Button>
      </Sheet>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          type="submit"
          variant="soft"
          color="primary"
          startDecorator={<SaveIcon />}
        >
          {testId ? 'Update' : 'Save'}
        </Button>
        <Button
          variant="outlined"
          startDecorator={<CancelIcon />}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </Box>
    </form>
  );
}
