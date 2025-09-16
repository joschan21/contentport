"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ContributionGraph,
  ContributionGraphBlock,
  ContributionGraphCalendar,
  ContributionGraphFooter,
  ContributionGraphLegend,
  ContributionGraphTotalCount,
} from "@/components/ui/kibo-ui/contribution-graph";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { client } from "@/lib/client";
import { useAccount } from "@/hooks/account-ctx";
import { useQuery } from "@tanstack/react-query";
import { eachDayOfInterval, endOfYear, format, formatISO, parseISO, startOfYear } from "date-fns";
import { useMemo } from "react";

const PostGraph = () => {
  const { account } = useAccount();
  const currentYear = new Date().getFullYear();

  const { data: apiData, isLoading, isError } = useQuery({
    queryKey: ['publishing-activity', account?.username, currentYear],
    queryFn: async () => {
      const res = await client.posted.getPublishingActivity.$get({
        year: currentYear,
        accountId: account?.id,
      });
      return await res.json();
    },
    enabled: !!account,
  });

  const fakeData = useMemo(() => {
    const maxCount = 20;
    const maxLevel = 4;
    const now = new Date();
    const days = eachDayOfInterval({
      start: startOfYear(now),
      end: endOfYear(now),
    });

    return days.map((date) => {
      const c = Math.round(
        Math.random() * maxCount - Math.random() * (0.8 * maxCount)
      );
      const count = Math.max(0, c);
      const level = Math.ceil((count / maxCount) * maxLevel);

      return {
        date: formatISO(date, { representation: "date" }),
        count,
        level
      };
    });
  }, []);

  const hasRealActivity = apiData?.activity?.some((day) => day.count > 0) ?? false;
  const shouldUseFakeData = isLoading || isError || !hasRealActivity;
  
  const data = shouldUseFakeData ? fakeData : apiData?.activity || fakeData;
  const totalCount = shouldUseFakeData ? fakeData.reduce((sum, day) => sum + day.count, 0) : apiData?.totalCount || 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-32 bg-muted rounded-lg mb-4" />
            <div className="flex justify-between items-center">
              <div className="h-4 bg-muted rounded w-24" />
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-3 w-3 bg-muted rounded-sm" />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 relative">
        <TooltipProvider>
          <div className="relative">
            <div className={cn(shouldUseFakeData && "blur-sm")}>
              <ContributionGraph data={data} blockSize={10} blockMargin={3}>
                <ContributionGraphCalendar>
                  {({ activity, dayIndex, weekIndex }) => (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <g>
                          <ContributionGraphBlock
                            activity={activity}
                            className={cn(
                              'data-[level="0"]:fill-muted dark:data-[level="0"]:fill-muted',
                              'data-[level="1"]:fill-primary/20 dark:data-[level="1"]:fill-primary/30',
                              'data-[level="2"]:fill-primary/40 dark:data-[level="2"]:fill-primary/50',
                              'data-[level="3"]:fill-primary/60 dark:data-[level="3"]:fill-primary/70',
                              'data-[level="4"]:fill-primary/80 dark:data-[level="4"]:fill-primary/90',
                            )}
                            dayIndex={dayIndex}
                            weekIndex={weekIndex}
                          />
                        </g>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-semibold">
                          {format(parseISO(activity.date), "MMMM d, yyyy")}
                        </p>
                        <p>
                          {activity.count}{" "}
                          {activity.count === 1 ? "tweet" : "tweets"} posted
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </ContributionGraphCalendar>
                <ContributionGraphFooter>
                  <ContributionGraphTotalCount>
                    {({ year }) => (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">
                          Year {year}:
                        </span>
                        <Badge variant="secondary">
                          {totalCount.toLocaleString()} tweets posted
                        </Badge>
                      </div>
                    )}
                  </ContributionGraphTotalCount>
                  <ContributionGraphLegend>
                    {({ level }) => (
                      <div
                        className="group relative flex h-3 w-3 items-center justify-center"
                        data-level={level}
                      >
                        <div
                          className={`h-full w-full rounded-sm border border-border ${level === 0 ? "bg-muted" : ""} ${level === 1 ? "bg-primary/20 dark:bg-primary/30" : ""} ${level === 2 ? "bg-primary/40 dark:bg-primary/50" : ""} ${level === 3 ? "bg-primary/60 dark:bg-primary/70" : ""} ${level === 4 ? "bg-primary/80 dark:bg-primary/90" : ""} `}
                        />
                        <span className="-top-8 absolute hidden rounded bg-popover px-2 py-1 text-popover-foreground text-xs shadow-md group-hover:block">
                          Level {level}
                        </span>
                      </div>
                    )}
                  </ContributionGraphLegend>
                </ContributionGraphFooter>
              </ContributionGraph>
            </div>
            
            {shouldUseFakeData && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-background/80 backdrop-blur-sm border rounded-lg px-6 py-4 shadow-lg text-center max-w-xs">
                  <p className="text-sm text-muted-foreground font-medium">
                    {isError 
                      ? "Unable to load your publishing activity"
                      : "Your publishing activity will appear here once you start posting"
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};

export default PostGraph;
