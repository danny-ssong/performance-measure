'use client'

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SelectOption } from '../_model/options'

// 편집 셀은 모두 비제어(defaultValue) 방식이다.
// 1000행 × 편집 셀 상태를 부모로 올리면 입력 한 번에 테이블 전체가 리렌더되기 때문이다.
// onValueChange는 값을 상태로 끌어올리는 용도가 아니라, 필요한 쪽(예: 가상화 테이블)이 입력값을 기록해두는 통로다.

type EditableCellProps = {
  label: string
  defaultValue: string
  onValueChange?: (value: string) => void
}

type AutocompleteCellProps = EditableCellProps & {
  options: readonly string[]
}

export function AutocompleteCell({
  label,
  options,
  defaultValue,
  onValueChange,
}: AutocompleteCellProps) {
  return (
    <Combobox
      items={options}
      defaultValue={defaultValue}
      // 선택을 해제하면 null이 오므로 빈 문자열로 맞춘다
      onValueChange={(value) => onValueChange?.(value ?? '')}
    >
      <ComboboxInput aria-label={label} placeholder="검색" className="h-7 w-full" />
      <ComboboxContent>
        <ComboboxEmpty>검색 결과가 없습니다.</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

type SelectCellProps = EditableCellProps & {
  options: ReadonlyArray<SelectOption>
}

export function SelectCell({ label, options, defaultValue, onValueChange }: SelectCellProps) {
  return (
    <Select
      items={options}
      defaultValue={defaultValue}
      onValueChange={(value) => onValueChange?.(value ?? '')}
    >
      <SelectTrigger aria-label={label} size="sm" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

type InputCellProps = EditableCellProps & {
  placeholder?: string
}

export function InputCell({ label, defaultValue, placeholder, onValueChange }: InputCellProps) {
  return (
    <Input
      aria-label={label}
      defaultValue={defaultValue}
      onChange={(event) => onValueChange?.(event.target.value)}
      placeholder={placeholder}
      className="h-7"
    />
  )
}
