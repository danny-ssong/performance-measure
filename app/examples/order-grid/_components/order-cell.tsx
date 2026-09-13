'use client'

import { cn } from '@/lib/utils'
import type { OrderRowResponse, OrderStringField } from '../_model/types'
import { AutocompleteCell, InputCell, SelectCell } from './editable-cells'
import type { OrderColumn } from './order-columns'

export type OrderCellEditHandler = (field: OrderStringField, value: string) => void

type OrderCellProps = {
  column: OrderColumn
  row: OrderRowResponse
  onEdit?: OrderCellEditHandler
}

export function OrderCell({ column, row, onEdit }: OrderCellProps) {
  switch (column.kind) {
    case 'text':
      return (
        <span className={cn('block truncate', column.align === 'right' && 'text-right')}>
          {column.getValue(row)}
        </span>
      )
    case 'autocomplete':
      return (
        <AutocompleteCell
          label={column.header}
          options={column.options}
          defaultValue={row[column.field]}
          onValueChange={(value) => onEdit?.(column.field, value)}
        />
      )
    case 'select':
      return (
        <SelectCell
          label={column.header}
          options={column.options}
          defaultValue={row[column.field]}
          onValueChange={(value) => onEdit?.(column.field, value)}
        />
      )
    case 'input':
      return (
        <InputCell
          label={column.header}
          defaultValue={row[column.field]}
          placeholder={column.placeholder}
          onValueChange={(value) => onEdit?.(column.field, value)}
        />
      )
  }
}
