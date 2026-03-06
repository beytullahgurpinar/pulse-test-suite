import { Box, Chip, Typography } from '@mui/joy';
import type { EnvVar } from '../types';

const PLACEHOLDERS = [
  { key: 'guid', label: 'GUID' },
  { key: 'uuid', label: 'UUID' },
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'fullName', label: 'Full Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'creditCard', label: 'Credit Card' },
  { key: 'amount', label: 'Amount' },
  { key: 'currency', label: 'Currency' },
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'date', label: 'Date' },
  { key: 'datetime', label: 'DateTime' },
];

interface Props {
  onInsert: (placeholder: string) => void;
  envVars?: EnvVar[];
}

export function PlaceholderChips({ onInsert, envVars = [] }: Props) {
  return (
    <Box sx={{ mb: 1 }}>
      {envVars.length > 0 && (
        <>
          <Typography level="body-xs" textColor="neutral.500" sx={{ display: 'block', mb: 0.5 }}>
            Environment variables:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            {envVars.map((ev) => (
              <Chip
                key={ev.id}
                size="sm"
                color="primary"
                variant="outlined"
                onClick={() => onInsert(`{{${ev.name}}}`)}
                sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
              >
                {ev.name}
              </Chip>
            ))}
          </Box>
        </>
      )}
      <Typography level="body-xs" textColor="neutral.500" sx={{ display: 'block', mb: 0.5 }}>
        Random data: click to insert at cursor
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {PLACEHOLDERS.map(({ key, label }) => (
          <Chip
            key={key}
            size="sm"
            variant="outlined"
            onClick={() => onInsert(`{{${key}}}`)}
            sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
          >
            {label}
          </Chip>
        ))}
      </Box>
    </Box>
  );
}
