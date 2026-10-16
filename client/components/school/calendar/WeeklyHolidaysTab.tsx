"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { applyServerErrors } from "@/lib/auth/formErrors";
import { dayKey } from "@/lib/dates";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import {
  todayKey,
  useDeleteWeeklyRule,
  useSetWeeklyRule,
  useWeeklyRules,
  type WeeklyRule,
  type Weekday,
} from "@/lib/school/calendar";
import { cn } from "@/lib/utils";
import { weeklyRuleSchema, type WeeklyRuleInput, type WeeklyRuleValues } from "@/zod/calendar";
import { useDateRange, useWeekdayName, WEEK_ORDER } from "./shared";

/** The weekly days off: the rule in force, its history, and a change from a date on. */
export function WeeklyHolidaysTab({ canManage }: { canManage: boolean }) {
  const t = useTranslations("school.calendar.weekly");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const weekday = useWeekdayName();
  const { data, isPending, isError, error, refetch } = useWeeklyRules();

  if (isPending) return <Skeleton className="h-48" />;
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
        <p>{t("loadFailed")}</p>
        <p className="text-xs">{describeError(error)}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {tCommon("tryAgain")}
        </Button>
      </div>
    );
  }

  const daysLabel = (days: Weekday[]) =>
    days.length === 0 ? t("none") : WEEK_ORDER.filter((d) => days.includes(d)).map((d) => weekday(d)).join(", ");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("currentTitle")}</CardTitle>
          <CardDescription>{t("currentDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.current ? (
            <div className="flex flex-wrap gap-2">
              {data.current.weekdays.length === 0 ? (
                <span className="text-sm text-muted-foreground">{t("none")}</span>
              ) : (
                WEEK_ORDER.filter((d) => data.current!.weekdays.includes(d)).map((d) => (
                  <Badge key={d} className="text-sm">
                    {weekday(d)}
                  </Badge>
                ))
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noRule")}</p>
          )}
          {data.rules.length > 0 && <RuleHistory rules={data.rules} daysLabel={daysLabel} canManage={canManage} />}
        </CardContent>
      </Card>

      {canManage && <ChangeRuleCard hasRules={data.rules.length > 0} current={data.current?.weekdays ?? [5]} />}
    </div>
  );
}

function RuleHistory({
  rules,
  daysLabel,
  canManage,
}: {
  rules: WeeklyRule[];
  daysLabel: (days: Weekday[]) => string;
  canManage: boolean;
}) {
  const t = useTranslations("school.calendar.weekly");
  const describeError = useErrorMessage();
  const dateRange = useDateRange();
  const remove = useDeleteWeeklyRule();
  const today = todayKey();
  // the latest rule that has started is the one in force
  const inForce = [...rules].reverse().find((r) => dayKey(r.effectiveFrom) <= today)?.id;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("from")}</TableHead>
          <TableHead>{t("daysOff")}</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...rules].reverse().map((rule) => {
          const upcoming = dayKey(rule.effectiveFrom) > today;
          return (
            <TableRow key={rule.id}>
              <TableCell className="whitespace-nowrap">
                {dateRange(rule.effectiveFrom, rule.effectiveFrom)}
                <div className="text-xs text-muted-foreground">
                  {upcoming ? t("upcoming") : rule.id === inForce ? t("inForce") : t("past")}
                </div>
              </TableCell>
              <TableCell>{daysLabel(rule.weekdays)}</TableCell>
              <TableCell>
                {/* only a rule that hasn't started can go; the rest is history */}
                {canManage && upcoming && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={t("deleteUpcoming")}
                    disabled={remove.isPending}
                    onClick={() =>
                      remove.mutate(rule.id, {
                        onSuccess: () => toast.success(t("deleted")),
                        onError: (e) => toast.error(describeError(e)),
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

const FIELDS: FieldPath<WeeklyRuleInput>[] = ["effectiveFrom", "weekdays"];

/** Tomorrow in Bangladesh: a change usually starts on a day that hasn't begun. */
const tomorrowKey = () => {
  const d = new Date(`${todayKey()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

function ChangeRuleCard({ hasRules, current }: { hasRules: boolean; current: Weekday[] }) {
  const t = useTranslations("school.calendar.weekly");
  const describeError = useErrorMessage();
  const weekday = useWeekdayName();
  const save = useSetWeeklyRule();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<WeeklyRuleInput, unknown, WeeklyRuleValues>({
    resolver: zodResolver(weeklyRuleSchema),
    // the first rule can start today; a change starts tomorrow (today has already begun)
    defaultValues: { effectiveFrom: hasRules ? tomorrowKey() : todayKey(), weekdays: current },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await save.mutateAsync({ effectiveFrom: values.effectiveFrom, weekdays: values.weekdays as Weekday[] });
      toast.success(t("saved"));
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, FIELDS, describeError));
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{hasRules ? t("changeTitle") : t("setTitle")}</CardTitle>
        <CardDescription>{t("changeDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <FormError message={formError} />
            <FormField
              control={form.control}
              name="weekdays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("daysOff")}</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {WEEK_ORDER.map((d) => {
                      const on = field.value.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          aria-pressed={on}
                          onClick={() => field.onChange(on ? field.value.filter((x) => x !== d) : [...field.value, d])}
                          className={cn(
                            "cursor-pointer rounded-md border px-3 py-1.5 text-sm transition-colors",
                            on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                          )}
                        >
                          {weekday(d)}
                        </button>
                      );
                    })}
                  </div>
                  <FormDescription>{t("daysOffHint")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="effectiveFrom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("startsOn")}</FormLabel>
                  <FormControl>
                    <Input type="date" className="w-48" {...field} />
                  </FormControl>
                  <FormDescription>{t("startsOnHint")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t("saving") : t("save")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
