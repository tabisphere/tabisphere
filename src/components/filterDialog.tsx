import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { filters } from "@/lib/filters";
import { Filter, PencilIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export default function FilterDialog({
  filterOpen,
  setFilterOpen,
  activeFilters,
  setActiveFilters,
  editingFilterId,
  setEditingFilterId,
  currentFilter,
  setCurrentFilter,
}: {
  filterOpen: boolean;
  setFilterOpen: (open: boolean) => void;
  activeFilters: {
    id: string;
    category: string;
    type: string;
    value: string;
  }[];
  setActiveFilters: (
    filters: {
      id: string;
      category: string;
      type: string;
      value: string;
    }[]
  ) => void;
  editingFilterId: string | null;
  setEditingFilterId: (id: string | null) => void;
  currentFilter: {
    category: string;
    type: string;
    value: string;
  };
  setCurrentFilter: (filter: {
    category: string;
    type: string;
    value: string;
  }) => void;
}) {
  return (
    <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
      <DialogTrigger asChild>
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 text-muted-foreground",
                activeFilters.length > 0 &&
                  "text-sky-700 hover:text-sky-800 dark:text-blue-400 dark:hover:text-blue-300"
              )}
              aria-label={
                activeFilters.length > 0
                  ? `${activeFilters.length} active filter(s)`
                  : "Filters"
              }
              onClick={() => setFilterOpen(true)}
              id="filter-button"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              Filters ({navigator.platform.includes("Mac") ? "⌥" : "Alt"}
              +F)
            </p>
          </TooltipContent>
        </Tooltip>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-5">
        <DialogHeader>
          <DialogTitle>Filters</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {activeFilters.length > 0 && (
            <div className="space-y-2">
              <Label>Active Filters</Label>
              <div className="flex gap-2 flex-wrap">
                {activeFilters.map(
                  (filter: {
                    id: string;
                    category: string;
                    type: string;
                    value: string;
                  }) => {
                    const filterCategory =
                      filters[filter.category as keyof typeof filters];
                    const filterOption = filterCategory?.options.find(
                      (opt) => opt.id === filter.type
                    );
                    return (
                      <div
                        key={filter.id}
                        className="flex gap-2 items-center border bg-background dark:bg-input/30 dark:border-input p-1 px-3 rounded-full w-fit"
                      >
                        <div className="flex whitespace-nowrap">
                          <span className="text-sm font-medium">
                            {filterCategory?.name}: {filterOption?.name}
                          </span>
                          {filter.value && (
                            <span className="text-sm text-muted-foreground ml-1">
                              "{filter.value}"
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-transparent size-3"
                            onClick={() => {
                              setEditingFilterId(filter.id);
                              setCurrentFilter({
                                category: filter.category,
                                type: filter.type,
                                value: filter.value,
                              });
                            }}
                          >
                            <PencilIcon className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-transparent size-3"
                            onClick={() => {
                              setActiveFilters(
                                activeFilters.filter((f) => f.id !== filter.id)
                              );
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <Label className="text-base">
              {editingFilterId ? "Edit Filter" : "Add New Filter"}
            </Label>
            <div className="space-y-3 mt-2">
              <div className="space-y-2">
                <Label>Filter Category</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={currentFilter.category}
                  onChange={(e) => {
                    setCurrentFilter({
                      ...currentFilter,
                      category: e.target.value,
                      type:
                        filters[e.target.value as keyof typeof filters]
                          ?.options[0]?.id || "",
                    });
                  }}
                >
                  {Object.values(filters).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Filter Type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={currentFilter.type}
                  onChange={(e) => {
                    setCurrentFilter({
                      ...currentFilter,
                      type: e.target.value,
                    });
                  }}
                >
                  {filters[
                    currentFilter.category as keyof typeof filters
                  ]?.options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
              {![
                "today",
                "yesterday",
                "this-week",
                "this-month",
                "this-year",
              ].includes(currentFilter.type) && (
                <div className="space-y-2">
                  <Label>
                    {currentFilter.category === "date"
                      ? "Number of days"
                      : currentFilter.type === "is-secure"
                      ? "Enter 'true' for HTTPS only"
                      : "Filter Value"}
                  </Label>
                  <Input
                    placeholder={
                      currentFilter.category === "date"
                        ? "Enter number of days"
                        : currentFilter.type === "is-secure"
                        ? "true or false"
                        : currentFilter.category === "url"
                        ? "Enter domain, path, or URL text"
                        : "Enter text to filter by"
                    }
                    value={currentFilter.value}
                    onChange={(e) => {
                      setCurrentFilter({
                        ...currentFilter,
                        value: e.target.value,
                      });
                    }}
                    id="filter-value-input"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (
                          currentFilter.type &&
                          (currentFilter.value.trim() ||
                            [
                              "today",
                              "yesterday",
                              "this-week",
                              "this-month",
                              "this-year",
                            ].includes(currentFilter.type))
                        ) {
                          if (editingFilterId) {
                            setActiveFilters(
                              activeFilters.map((f) =>
                                f.id === editingFilterId
                                  ? {
                                      ...f,
                                      category: currentFilter.category,
                                      type: currentFilter.type,
                                      value: currentFilter.value,
                                    }
                                  : f
                              )
                            );
                            setEditingFilterId(null);
                          } else {
                            const newFilter = {
                              id: `${currentFilter.category}-${
                                currentFilter.type
                              }-${Date.now()}`,
                              category: currentFilter.category,
                              type: currentFilter.type,
                              value: currentFilter.value,
                            };
                            setActiveFilters([...activeFilters, newFilter]);
                          }
                          setCurrentFilter({
                            category: "title",
                            type: "contains",
                            value: "",
                          });
                        }
                      }
                    }}
                  />
                </div>
              )}
              <div className="flex gap-2">
                {editingFilterId && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingFilterId(null);
                      setCurrentFilter({
                        category: "title",
                        type: "contains",
                        value: "",
                      });
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  onClick={() => {
                    if (
                      currentFilter.type &&
                      (currentFilter.value.trim() ||
                        [
                          "today",
                          "yesterday",
                          "this-week",
                          "this-month",
                          "this-year",
                        ].includes(currentFilter.type))
                    ) {
                      if (editingFilterId) {
                        setActiveFilters(
                          activeFilters.map((f) =>
                            f.id === editingFilterId
                              ? {
                                  ...f,
                                  category: currentFilter.category,
                                  type: currentFilter.type,
                                  value: currentFilter.value,
                                }
                              : f
                          )
                        );
                        setEditingFilterId(null);
                      } else {
                        const newFilter = {
                          id: `${currentFilter.category}-${
                            currentFilter.type
                          }-${Date.now()}`,
                          category: currentFilter.category,
                          type: currentFilter.type,
                          value: currentFilter.value,
                        };
                        setActiveFilters([...activeFilters, newFilter]);
                      }
                      setCurrentFilter({
                        category: "title",
                        type: "contains",
                        value: "",
                      });
                    }
                  }}
                  disabled={
                    !currentFilter.type ||
                    (!currentFilter.value.trim() &&
                      ![
                        "today",
                        "yesterday",
                        "this-week",
                        "this-month",
                        "this-year",
                      ].includes(currentFilter.type))
                  }
                  className="flex-1"
                >
                  {editingFilterId ? "Update Filter" : "Add Filter"}
                </Button>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={activeFilters.length === 0}
            onClick={() => {
              setActiveFilters([]);
            }}
          >
            Clear All Filters
          </Button>
          <DialogClose asChild>
            <Button>Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
