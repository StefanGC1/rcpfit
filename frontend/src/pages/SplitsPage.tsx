import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import {
  Plus,
  Loader2,
  Layers,
  ChevronRight,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AxiosError } from "axios";

import { api } from "@/lib/api";
import type { Split } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Validation schema for split form
const splitSchema = z.object({
  name: z
    .string()
    .min(1, "Split name is required")
    .max(100, "Split name must be less than 100 characters"),
});

type SplitFormValues = z.infer<typeof splitSchema>;

// Type for basic split info (without templates, as returned by list endpoint)
interface SplitBasic {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

export default function SplitsPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingSplit, setDeletingSplit] = useState<SplitBasic | null>(null);

  // Fetch splits
  const {
    data: splits,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["splits"],
    queryFn: async () => {
      const response = await api.get<SplitBasic[]>("/splits");
      return response.data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: SplitFormValues) => {
      const response = await api.post<Split>("/splits", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["splits"] });
      setIsCreateOpen(false);
      toast.success("Split created successfully");
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      const message =
        error.response?.data?.detail ?? "Failed to create split";
      toast.error(message);
    },
  });

  // Set active mutation
  const setActiveMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.put<Split>(`/splits/${id}`, {
        is_active: true,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["splits"] });
      toast.success("Active split updated");
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      const message =
        error.response?.data?.detail ?? "Failed to set active split";
      toast.error(message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/splits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["splits"] });
      setDeletingSplit(null);
      toast.success("Split deleted successfully");
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      const message =
        error.response?.data?.detail ?? "Failed to delete split";
      toast.error(message);
    },
  });

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load splits</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Splits</h1>
          <p className="text-muted-foreground">
            Organize your workout routines
          </p>
        </div>

        {/* Create Split Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Split
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Split</DialogTitle>
              <DialogDescription>
                A split organizes your workout templates (e.g., "Push Pull
                Legs", "Upper/Lower").
              </DialogDescription>
            </DialogHeader>
            <SplitForm
              onSubmit={(data) => createMutation.mutate(data)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && splits?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No splits yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first split to start organizing your workouts.
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Split
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Splits grid */}
      {!isLoading && splits && splits.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {splits.map((split) => (
            <Card
              key={split.id}
              className={cn(
                "relative transition-colors",
                split.is_active && "border-primary"
              )}
            >
              {split.is_active && (
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    <Star className="h-3 w-3 fill-primary" />
                    Active
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  {split.name}
                </CardTitle>
                <CardDescription>
                  Created {new Date(split.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Button asChild variant="default" className="flex-1">
                    <Link to={`/splits/${split.id}`}>
                      View Details
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  {!split.is_active && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setActiveMutation.mutate(split.id)}
                      disabled={setActiveMutation.isPending}
                      title="Set as active"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setDeletingSplit(split)}
                    title="Delete split"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deletingSplit !== null}
        onOpenChange={(open) => !open && setDeletingSplit(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Split</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingSplit?.name}"? This will
              also delete all templates within this split. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingSplit(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deletingSplit && deleteMutation.mutate(deletingSplit.id)
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Reusable form component for create
interface SplitFormProps {
  defaultValues?: SplitFormValues;
  onSubmit: (data: SplitFormValues) => void;
  isLoading: boolean;
  submitLabel?: string;
}

function SplitForm({
  defaultValues = { name: "" },
  onSubmit,
  isLoading,
  submitLabel = "Create Split",
}: SplitFormProps) {
  const form = useForm<SplitFormValues>({
    resolver: zodResolver(splitSchema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Split Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Push Pull Legs"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
