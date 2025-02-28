import React from "react";
import { t } from "ttag";
import moment from "moment";
import _ from "underscore";

import {
  ExcludeCheckBox,
  ExcludeColumn,
  ExcludeContainer,
  ExcludeLabel,
  OptionButton,
  Separator,
} from "./ExcludeDatePicker.styled";

import { FieldDimension } from "metabase-lib/lib/Dimension";
import { Field } from "metabase-types/types/Field";
import Filter from "metabase-lib/lib/queries/structured/Filter";
import { color } from "metabase/lib/colors";

function getDateTimeField(field: Field, bucketing?: string) {
  const dimension = FieldDimension.parseMBQLOrWarn(field);
  if (dimension) {
    if (bucketing) {
      return dimension.withTemporalUnit(bucketing).mbql();
    } else {
      return dimension.withoutTemporalBucketing().mbql();
    }
  }
  return field;
}

type Option = {
  displayName: string;
  value: string;
  test: (value: string) => boolean;
};

type Group = {
  displayName: string;
  init: (filter: Filter) => any[];
  test: (filter: Filter) => boolean;
  getOptions: () => Option[][];
  twoColumns?: boolean;
};

const testTemporalUnit = (unit: string) => (filter: Filter) => {
  const dimension = FieldDimension.parseMBQLOrWarn(filter[1]);
  if (dimension) {
    return dimension.temporalUnit() === unit;
  }
  return false;
};

const EXCLUDE: Group[] = [
  {
    displayName: t`Days of the week...`,
    test: testTemporalUnit("day-of-week"),
    init: filter => ["!=", getDateTimeField(filter[1], "day-of-week")],
    getOptions: () => {
      const now = moment()
        .utc()
        .hours(0)
        .minutes(0)
        .seconds(0);
      return [
        _.range(0, 7).map(day => {
          const date = now.day(day + 1);
          const displayName = date.format("dddd");
          const value = date.format("YYYY-MM-DD");
          return {
            displayName,
            value,
            test: val => value === val,
          };
        }),
      ];
    },
  },
  {
    displayName: t`Months of the year...`,
    test: testTemporalUnit("month-of-year"),
    init: filter => ["!=", getDateTimeField(filter[1], "month-of-year")],
    getOptions: () => {
      const now = moment()
        .utc()
        .hours(0)
        .minutes(0)
        .seconds(0);
      const func = (month: number) => {
        const date = now.month(month);
        const displayName = date.format("MMMM");
        const value = date.format("YYYY-MM-DD");
        return {
          displayName,
          value,
          test: (value: string) => moment(value).format("MMMM") === displayName,
        };
      };
      return [_.range(0, 6).map(func), _.range(6, 12).map(func)];
    },
    twoColumns: true,
  },
  {
    displayName: t`Quarters of the year...`,
    test: testTemporalUnit("quarter-of-year"),
    init: filter => ["!=", getDateTimeField(filter[1], "quarter-of-year")],
    getOptions: () => {
      const now = moment()
        .utc()
        .hours(0)
        .minutes(0)
        .seconds(0);
      const suffix = " " + t`quarter`;
      return [
        _.range(1, 5).map(quarter => {
          const date = now.quarter(quarter);
          const displayName = date.format("Qo");
          const value = date.format("YYYY-MM-DD");
          return {
            displayName: displayName + suffix,
            value,
            test: (value: string) => moment(value).format("Qo") === displayName,
          };
        }),
      ];
    },
  },
  {
    displayName: t`Hours of the day...`,
    test: testTemporalUnit("hour-of-day"),
    init: filter => ["!=", getDateTimeField(filter[1], "hour-of-day")],
    getOptions: () => {
      const now = moment()
        .utc()
        .minutes(0)
        .seconds(0);
      const func = (hour: number) => {
        const date = now.hour(hour);
        const displayName = date.format("h A");
        return {
          displayName,
          value: date.toISOString(),
          test: (value: string) =>
            moment(value)
              .utc()
              .format("h A") === displayName,
        };
      };
      return [_.range(0, 12).map(func), _.range(12, 24).map(func)];
    },
    twoColumns: true,
  },
];

export function getHeaderText(filter: Filter) {
  return getExcludeOperator(filter)?.displayName || t`Exclude...`;
}

export function getExcludeOperator(filter: Filter) {
  return _.find(EXCLUDE, ({ test }) => test(filter));
}

type Props = {
  primaryColor?: string;
  filter: Filter;
  onFilterChange: (filter: any[]) => void;
  className?: string;
  onCommit: (filter: any[]) => void;
  hideEmptinessOperators?: boolean;
};

export default function ExcludeDatePicker({
  className,
  onFilterChange,
  filter,
  primaryColor = color("brand"),
  onCommit,
  hideEmptinessOperators,
}: Props) {
  const [operator, field, ...values] = filter;
  const temporalUnit = _.find(EXCLUDE, ({ test }) => test(filter));

  if (!temporalUnit || operator === "is-null" || operator === "not-null") {
    return (
      <div className={className}>
        {EXCLUDE.map(({ displayName, init }) => (
          <OptionButton
            key={displayName}
            onClick={() => {
              onFilterChange(init(filter));
            }}
          >
            {displayName}
          </OptionButton>
        ))}
        {!hideEmptinessOperators && (
          <>
            <Separator />
            <OptionButton
              selected={operator === "is-null"}
              primaryColor={primaryColor}
              onClick={() => {
                onCommit(["is-null", getDateTimeField(filter[1])]);
              }}
            >
              {t`Is empty`}
            </OptionButton>
            <OptionButton
              selected={operator === "not-null"}
              primaryColor={primaryColor}
              onClick={() => {
                onCommit(["not-null", getDateTimeField(filter[1])]);
              }}
            >
              {t`Is not empty`}
            </OptionButton>
          </>
        )}
      </div>
    );
  }

  const { getOptions } = temporalUnit;
  const options = getOptions();
  const update = (values: string[]) =>
    onFilterChange([operator, field, ...values]);
  const allSelected = values.length === 0;
  const selectAllLabel = allSelected ? t`Select none...` : t`Select all...`;

  return (
    <div className={className}>
      <ExcludeCheckBox
        label={<ExcludeLabel>{selectAllLabel}</ExcludeLabel>}
        checked={allSelected}
        onChange={() =>
          update(allSelected ? options.flat().map(({ value }) => value) : [])
        }
      />
      <Separator />
      <ExcludeContainer>
        {options.map((inner, index) => (
          <ExcludeColumn key={index}>
            {inner.map(({ displayName, value, test }) => {
              const checked = !_.find(values, value => test(value));
              return (
                <ExcludeCheckBox
                  key={value}
                  label={<ExcludeLabel>{displayName}</ExcludeLabel>}
                  checked={checked}
                  checkedColor={primaryColor}
                  onChange={() => {
                    if (checked) {
                      update([...values, value]);
                    } else {
                      update(values.filter(value => !test(value)));
                    }
                  }}
                />
              );
            })}
          </ExcludeColumn>
        ))}
      </ExcludeContainer>
    </div>
  );
}
