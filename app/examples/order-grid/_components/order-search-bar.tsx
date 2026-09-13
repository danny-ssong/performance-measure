'use client'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ORDER_ROW_COUNT_OPTIONS, isOrderRowCount, type OrderRowCount } from '../_model/options'

type OrderSearchBarProps = {
  rowCount: OrderRowCount
  onRowCountChange: (rowCount: OrderRowCount) => void
  onSearch: () => void
  isSearching: boolean
}

export function OrderSearchBar({
  rowCount,
  onRowCountChange,
  onSearch,
  isSearching,
}: OrderSearchBarProps) {
  return (
    <form
      className="flex flex-wrap items-center gap-4 rounded-lg border p-3"
      onSubmit={(event) => {
        event.preventDefault()
        onSearch()
      }}
    >
      <span className="text-sm font-medium">조회 건수</span>
      <RadioGroup
        aria-label="조회 건수"
        value={rowCount}
        onValueChange={(value) => {
          if (isOrderRowCount(value)) onRowCountChange(value)
        }}
        className="flex w-auto gap-4"
      >
        {ORDER_ROW_COUNT_OPTIONS.map((option) => (
          <Label key={option} className="cursor-pointer font-normal">
            <RadioGroupItem value={option} />
            {option.toLocaleString('ko-KR')}건
          </Label>
        ))}
      </RadioGroup>
      <Button type="submit" className="ml-auto" disabled={isSearching}>
        {isSearching ? '조회 중...' : '조회'}
      </Button>
    </form>
  )
}
