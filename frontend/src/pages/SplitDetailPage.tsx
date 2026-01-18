import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AxiosError } from "axios";

import { api } from "@/lib/api";
import type { Split, Template, Exercise } from "@/types";
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Validation schemas
const templateSchema = z.object({
  name: z
    .string()
    .min(1, "Template name is required")
    .max(100, "Template name must be less than 100 characters"),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

export default function SplitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const splitId = parseInt(id ?? "0", 10);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(
    null
  );
  const [expandedTemplateId, setExpandedTemplateId] = useState<number | null>(
    null
  );
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const [addingExerciseToTemplate, setAddingExerciseToTemplate] =
    useState<Template | null>(null);

  // Fetch split with templates
  const {
    data: split,
    isLoading: splitLoading,
    error: splitError,
  } = useQuery({
    queryKey: ["splits", splitId],
    queryFn: async () => {
      const response = await api.get<Split>(`/splits/${splitId}`);
      return response.data;
    },
    enabled: splitId > 0,
  });

  // Fetch all exercises for the exercise picker
  const { data: exercises } = useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const response = await api.get<Exercise[]>("/exercises");
      return response.data;
    },
  });

  // Fetch template details when expanded
  const { data: expandedTemplate, isLoading: templateLoading } = useQuery({
    queryKey: ["templates", expandedTemplateId],
    queryFn: async () => {
      const response = await api.get<Template>(
        `/templates/${expandedTemplateId}`
      );
      return response.data;
    },
    enabled: expandedTemplateId !== null,
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      const order = (split?.templates?.length ?? 0) + 1;
      const response = await api.post<Template>("/templates", {
        split_id: splitId,
        name: data.name,
        order,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["splits", splitId] });
      setIsCreateOpen(false);
      toast.success("Template created successfully");
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      const message =
        error.response?.data?.detail ?? "Failed to create template";
      toast.error(message);
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: TemplateFormValues;
    }) => {
      const response = await api.put<Template>(`/templates/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["splits", splitId] });
      setEditingTemplate(null);
      toast.success("Template updated successfully");
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      const message =
        error.response?.data?.detail ?? "Failed to update template";
      toast.error(message);
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["splits", splitId] });
      setDeletingTemplate(null);
      if (expandedTemplateId === deletingTemplate?.id) {
        setExpandedTemplateId(null);
      }
      toast.success("Template deleted successfully");
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      const message =
        error.response?.data?.detail ?? "Failed to delete template";
      toast.error(message);
    },
  });

  // Add exercise to template mutation
  const addExerciseMutation = useMutation({
    mutationFn: async ({
      templateId,
      exerciseId,
    }: {
      templateId: number;
      exerciseId: number;
    }) => {
      const order = (expandedTemplate?.exercises?.length ?? 0) + 1;
      const response = await api.post<Template>(
        `/templates/${templateId}/exercises`,
        {
          exercise_definition_id: exerciseId,
          order,
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["templates", expandedTemplateId],
      });
      setIsAddExerciseOpen(false);
      setAddingExerciseToTemplate(null);
      toast.success("Exercise added to template");
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      const message =
        error.response?.data?.detail ?? "Failed to add exercise";
      toast.error(message);
    },
  });

  // Remove exercise from template mutation
  const removeExerciseMutation = useMutation({
    mutationFn: async ({
      templateId,
      exerciseId,
    }: {
      templateId: number;
      exerciseId: number;
    }) => {
      await api.delete(`/templates/${templateId}/exercises/${exerciseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["templates", expandedTemplateId],
      });
      toast.success("Exercise removed from template");
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      const message =
        error.response?.data?.detail ?? "Failed to remove exercise";
      toast.error(message);
    },
  });

  // Reorder exercises mutation
  const reorderExercisesMutation = useMutation({
    mutationFn: async ({
      templateId,
      exerciseOrders,
    }: {
      templateId: number;
      exerciseOrders: { exercise_definition_id: number; order: number }[];
    }) => {
      await api.put(`/templates/${templateId}/exercises/reorder`, {
        exercise_orders: exerciseOrders,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["templates", expandedTemplateId],
      });
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      const message =
        error.response?.data?.detail ?? "Failed to reorder exercises";
      toast.error(message);
    },
  });

  const handleMoveExercise = (exerciseId: number, direction: "up" | "down") => {
    if (!expandedTemplate?.exercises) return;

    const exercises = [...expandedTemplate.exercises];
    const currentIndex = exercises.findIndex((e) => e.id === exerciseId);

    if (currentIndex === -1) return;
    if (direction === "up" && currentIndex === 0) return;
    if (direction === "down" && currentIndex === exercises.length - 1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    // Swap the exercises
    [exercises[currentIndex], exercises[newIndex]] = [
      exercises[newIndex],
      exercises[currentIndex],
    ];

    // Build new order array
    const exerciseOrders = exercises.map((e, idx) => ({
      exercise_definition_id: e.id,
      order: idx + 1,
    }));

    reorderExercisesMutation.mutate({
      templateId: expandedTemplate.id,
      exerciseOrders,
    });
  };

  const handleToggleExpand = (templateId: number) => {
    setExpandedTemplateId(
      expandedTemplateId === templateId ? null : templateId
    );
  };

  const handleAddExercise = (template: Template) => {
    setAddingExerciseToTemplate(template);
    setIsAddExerciseOpen(true);
    // If not already expanded, expand it
    if (expandedTemplateId !== template.id) {
      setExpandedTemplateId(template.id);
    }
  };

  // Get exercises that are not already in the template
  const availableExercises =
    exercises?.filter(
      (exercise) =>
        !expandedTemplate?.exercises?.some((e) => e.id === exercise.id)
    ) ?? [];

  if (splitError) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">Failed to load split</p>
        <Button variant="outline" onClick={() => navigate("/splits")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Splits
        </Button>
      </div>
    );
  }

  if (splitLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!split) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Split not found</p>
        <Button variant="outline" onClick={() => navigate("/splits")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Splits
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/splits">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{split.name}</h1>
          <p className="text-muted-foreground">
            {split.templates?.length ?? 0} template
            {(split.templates?.length ?? 0) !== 1 && "s"}
          </p>
        </div>

        {/* Create Template Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Template</DialogTitle>
              <DialogDescription>
                Create a workout template for this split (e.g., "Push Day",
                "Legs Heavy").
              </DialogDescription>
            </DialogHeader>
            <TemplateForm
              onSubmit={(data) => createTemplateMutation.mutate(data)}
              isLoading={createTemplateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Empty state */}
      {split.templates?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GripVertical className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No templates yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add templates to define your workout days for this split.
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Templates list */}
      {split.templates && split.templates.length > 0 && (
        <div className="space-y-3">
          {split.templates.map((template) => (
            <Card
              key={template.id}
              className={cn(
                "transition-all",
                expandedTemplateId === template.id && "ring-2 ring-primary"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => handleToggleExpand(template.id)}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                      {template.order}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>
                        {expandedTemplateId === template.id
                          ? `${expandedTemplate?.exercises?.length ?? 0} exercises`
                          : "Click to view exercises"}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleExpand(template.id)}
                    >
                      {expandedTemplateId === template.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingTemplate(template)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingTemplate(template)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Expanded content - exercises */}
              {expandedTemplateId === template.id && (
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
                  {templateLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      {expandedTemplate?.exercises?.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-4">
                          No exercises in this template yet.
                        </p>
                      ) : (
                        <div className="space-y-2 mb-4">
                          {expandedTemplate?.exercises?.map(
                            (exercise, index) => (
                              <div
                                key={exercise.id}
                                className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-muted-foreground w-6">
                                    {index + 1}.
                                  </span>
                                  <span className="font-medium">
                                    {exercise.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() =>
                                      handleMoveExercise(exercise.id, "up")
                                    }
                                    disabled={
                                      index === 0 ||
                                      reorderExercisesMutation.isPending
                                    }
                                    title="Move up"
                                  >
                                    <ArrowUp className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() =>
                                      handleMoveExercise(exercise.id, "down")
                                    }
                                    disabled={
                                      index ===
                                        (expandedTemplate?.exercises?.length ??
                                          0) -
                                          1 ||
                                      reorderExercisesMutation.isPending
                                    }
                                    title="Move down"
                                  >
                                    <ArrowDown className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() =>
                                      removeExerciseMutation.mutate({
                                        templateId: template.id,
                                        exerciseId: exercise.id,
                                      })
                                    }
                                    disabled={removeExerciseMutation.isPending}
                                    title="Remove"
                                  >
                                    <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddExercise(template)}
                        className="w-full"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Exercise
                      </Button>
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Edit Template Dialog */}
      <Dialog
        open={editingTemplate !== null}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>Update the template name.</DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <TemplateForm
              defaultValues={{ name: editingTemplate.name }}
              onSubmit={(data) =>
                updateTemplateMutation.mutate({ id: editingTemplate.id, data })
              }
              isLoading={updateTemplateMutation.isPending}
              submitLabel="Save Changes"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Template Dialog */}
      <Dialog
        open={deletingTemplate !== null}
        onOpenChange={(open) => !open && setDeletingTemplate(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingTemplate?.name}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingTemplate(null)}
              disabled={deleteTemplateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deletingTemplate &&
                deleteTemplateMutation.mutate(deletingTemplate.id)
              }
              disabled={deleteTemplateMutation.isPending}
            >
              {deleteTemplateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Exercise Dialog */}
      <Dialog
        open={isAddExerciseOpen}
        onOpenChange={(open) => {
          setIsAddExerciseOpen(open);
          if (!open) setAddingExerciseToTemplate(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Exercise to Template</DialogTitle>
            <DialogDescription>
              Select an exercise to add to "{addingExerciseToTemplate?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {availableExercises.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                {exercises?.length === 0 ? (
                  <>
                    No exercises available.{" "}
                    <Link to="/exercises" className="text-primary underline">
                      Create some exercises first
                    </Link>
                    .
                  </>
                ) : (
                  "All exercises are already in this template."
                )}
              </p>
            ) : (
              availableExercises.map((exercise) => (
                <Button
                  key={exercise.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() =>
                    addingExerciseToTemplate &&
                    addExerciseMutation.mutate({
                      templateId: addingExerciseToTemplate.id,
                      exerciseId: exercise.id,
                    })
                  }
                  disabled={addExerciseMutation.isPending}
                >
                  {exercise.name}
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Reusable form component for create/edit templates
interface TemplateFormProps {
  defaultValues?: TemplateFormValues;
  onSubmit: (data: TemplateFormValues) => void;
  isLoading: boolean;
  submitLabel?: string;
}

function TemplateForm({
  defaultValues = { name: "" },
  onSubmit,
  isLoading,
  submitLabel = "Create Template",
}: TemplateFormProps) {
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
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
              <FormLabel>Template Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Push Day A"
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
