import { Select, Option } from '@mui/joy';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import type { Environment } from '../types';

interface Props {
  environments: Environment[];
  value: number | undefined;
  onChange: (id: number | undefined) => void;
}

export function EnvironmentSelect({ environments, value, onChange }: Props) {
  if (environments.length === 0) return null;

  return (
    <Select
      size="sm"
      variant="outlined"
      value={value != null ? String(value) : null}
      onChange={(_, val) => onChange(val ? Number(val) : undefined)}
      placeholder="Environment"
      sx={{
        minWidth: 140,
        fontWeight: 600,
        fontSize: '0.8rem',
        '--Select-minHeight': '34px',
      }}
    >
      {environments.map((env) => (
        <Option key={env.id} value={String(env.id)}>
          {env.isDefault && <StarRoundedIcon sx={{ fontSize: 12, mr: 0.5 }} />}
          {env.name}
        </Option>
      ))}
    </Select>
  );
}
