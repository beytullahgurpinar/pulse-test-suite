import {
  Box,
  Typography,
  Sheet,
  Select,
  Option,
  IconButton,
} from '@mui/joy';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const PAGE_SIZES = [10, 20, 50, 100];

export const tableStyles = {
  width: '100%',
  '& thead th': {
    py: 1.5,
    px: 2,
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: 'text.tertiary',
    borderBottom: '1px solid',
    borderColor: 'neutral.200',
    bgcolor: 'background.level1',
    '[data-joy-color-scheme="dark"] &': {
      borderColor: 'neutral.300',
    },
  },
  '& tbody td': {
    py: 1.5,
    px: 2,
    borderBottom: '1px solid',
    borderColor: 'neutral.200',
    verticalAlign: 'middle' as const,
    '[data-joy-color-scheme="dark"] &': {
      borderColor: 'neutral.300',
    },
  },
  '& tbody tr': {
    transition: 'background-color 0.15s ease',
    '&:hover': {
      bgcolor: 'background.level1',
    },
    '&:last-child td': {
      borderBottom: 'none',
    },
  },
};

interface DataTablePaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function DataTablePagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: DataTablePaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startItem = totalItems === 0 ? 0 : page * pageSize + 1;
  const endItem = Math.min((page + 1) * pageSize, totalItems);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
        px: 2,
        py: 1.5,
        borderTop: '1px solid',
        borderColor: 'neutral.200',
        bgcolor: 'background.level1',
        '[data-joy-color-scheme="dark"] &': {
          borderColor: 'neutral.300',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography level="body-sm" sx={{ color: 'text.tertiary', fontSize: '0.75rem' }}>
          Rows per page:
        </Typography>
        <Select
          size="sm"
          value={pageSize}
          onChange={(_, v) => {
            onPageSizeChange(v as number);
            onPageChange(0);
          }}
          sx={{
            minWidth: 70,
            borderRadius: '6px',
          }}
        >
          {PAGE_SIZES.map((s) => (
            <Option key={s} value={s}>{s}</Option>
          ))}
        </Select>
        <Typography level="body-sm" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
          {startItem}–{endItem} of {totalItems}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <IconButton
          size="sm"
          variant="outlined"
          color="neutral"
          disabled={page === 0}
          onClick={() => onPageChange(Math.max(0, page - 1))}
          sx={{
            borderRadius: '6px',
            '--IconButton-size': '30px',
            borderColor: 'neutral.300',
            '[data-joy-color-scheme="dark"] &': {
              borderColor: 'neutral.400',
            },
          }}
        >
          <ChevronLeftIcon sx={{ fontSize: 18 }} />
        </IconButton>
        <Typography level="body-sm" sx={{ minWidth: 80, textAlign: 'center', fontSize: '0.75rem', color: 'text.secondary' }}>
          Page {page + 1} of {totalPages}
        </Typography>
        <IconButton
          size="sm"
          variant="outlined"
          color="neutral"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
          sx={{
            borderRadius: '6px',
            '--IconButton-size': '30px',
            borderColor: 'neutral.300',
            '[data-joy-color-scheme="dark"] &': {
              borderColor: 'neutral.400',
            },
          }}
        >
          <ChevronRightIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Box>
  );
}

interface DataTableWrapperProps {
  children: React.ReactNode;
  pagination?: React.ReactNode;
}

export function DataTableWrapper({ children, pagination }: DataTableWrapperProps) {
  return (
    <Sheet
      variant="outlined"
      sx={{
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'neutral.200',
        '[data-joy-color-scheme="dark"] &': {
          borderColor: 'neutral.300',
        },
      }}
    >
      {children}
      {pagination}
    </Sheet>
  );
}
