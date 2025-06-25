import { ArrowUpDown } from "lucide-react";
import { sorts } from "@/lib/sorts";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function SortDropdown({
  setSort,
  sort,
}: {
  setSort: (value: string | ((val: string) => string)) => void;
  sort: string;
}) {
  return (
    <div>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger id="sort-button">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 text-muted-foreground",
                  !sorts.find((s) => s.id === sort)?.default &&
                    "text-sky-700 hover:text-sky-800 dark:text-blue-400 dark:hover:text-blue-300"
                )}
                aria-label="Sort"
              >
                <ArrowUpDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Sort</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent>
          {sorts.map((sort) => (
            <DropdownMenuItem
              key={sort.name}
              onClick={() => {
                setSort(sorts.find((s) => s.id === sort.id)?.id || sorts[0].id);
              }}
            >
              {sort.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
