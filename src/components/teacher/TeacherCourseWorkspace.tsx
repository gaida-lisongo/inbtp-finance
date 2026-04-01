"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import {
  createTeacherActivityAction,
  exportActivityNotesAction,
  saveTeacherActivityQuestionsAction,
  saveTeacherCourseDescriptorAction,
  saveTeacherCoursePlanAction,
} from "@/app/(admin)/(teacher)/enseignant/cours/[matiere_id]/actions";
import FormSubmitButton from "@/components/common/FormSubmitButton";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { parsePlanChapters, renderStructuredValue } from "@/components/student/course/course-overview-shared";
import { Modal } from "@/components/ui/modal";
import type { TeacherCourseActivity, TeacherCoursePageDetails } from "@/lib/utils/supabase/teacher-teaching";

type TeacherTab = "descriptor" | "plan" | "qcm" | "tp";
type PlanDraftChapter = {
  id: string;
  chapter: string;
  items: string[];
};

const tabs: Array<{ id: TeacherTab; label: string }> = [
  { id: "descriptor", label: "Descripteur" },
  { id: "plan", label: "Plan du Cours" },
  { id: "qcm", label: "QCM" },
  { id: "tp", label: "TP" },
];

const tabClassName = (isActive: boolean) =>
  `rounded-full px-4 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-brand-500 text-white"
      : "border border-gray-300 text-gray-700 hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
  }`;

const textareaClassName =
  "w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const serializeEditableValue = (value: unknown) => {
  if (typeof value === "string") {
    return value;
  }

  if (value == null) {
    return "";
  }

  return JSON.stringify(value, null, 2);
};

const buildPlanDraft = (value: unknown): PlanDraftChapter[] => {
  const chapters = parsePlanChapters(value);

  if (chapters.length === 0) {
    return [{ id: createPlanId(), chapter: "", items: [""] }];
  }

  return chapters.map((chapter) => ({
    id: createPlanId(),
    chapter: chapter.chapter,
    items: chapter.items.length > 0 ? chapter.items : [""],
  }));
};

const createPlanId = () => `plan-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function TeacherCourseWorkspace({
  data,
  initialTab,
}: {
  data: TeacherCoursePageDetails;
  initialTab?: string;
}) {
  const [activeTab, setActiveTab] = useState<TeacherTab>(initialTab === "plan" || initialTab === "qcm" || initialTab === "tp" ? initialTab : "descriptor");
  const [planDraft, setPlanDraft] = useState<PlanDraftChapter[]>(() => buildPlanDraft(data.courseDetails?.plan ?? null));
  const [modalField, setModalField] = useState<null | "description" | "objectifs" | "methodologies" | "penalites" | "competences" | "disponiblites">(null);
  const [planViewMode, setPlanViewMode] = useState<"edit" | "read">("edit");
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [modalChapterTitle, setModalChapterTitle] = useState("");
  const [modalChapterItems, setModalChapterItems] = useState<string[]>([""]);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [questionEditorActivity, setQuestionEditorActivity] = useState<TeacherCourseActivity | null>(null);
  const [notesModalActivity, setNotesModalActivity] = useState<TeacherCourseActivity | null>(null);
  const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false);
  const [activityToAddCategory, setActivityToAddCategory] = useState<TeacherCourseActivity["category"]>("qcm");

  const planPreview = useMemo(
    () =>
      planDraft
        .map((chapter) => ({
          chapter: chapter.chapter.trim(),
          items: chapter.items.map((item) => item.trim()).filter(Boolean),
        }))
        .filter((chapter) => chapter.chapter.length > 0),
    [planDraft],
  );
  const qcmActivities = data.activities.filter((activity) => activity.category === "qcm");
  const tpActivities = data.activities.filter((activity) => activity.category === "tp");

  const togglePlanViewMode = () => {
    setPlanViewMode((current) => (current === "edit" ? "read" : "edit"));
  };

  const openChapterEditor = (chapter?: PlanDraftChapter) => {
    if (chapter) {
      setEditingChapterId(chapter.id);
      setModalChapterTitle(chapter.chapter);
      setModalChapterItems(chapter.items.length > 0 ? chapter.items : [""]);
    } else {
      setEditingChapterId(null);
      setModalChapterTitle("");
      setModalChapterItems([""]);
    }

    setPlanViewMode("edit");
    setIsChapterModalOpen(true);
  };

  const closeChapterModal = () => {
    setIsChapterModalOpen(false);
  };

  const handleModalItemChange = (index: number, value: string) => {
    setModalChapterItems((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  const addModalItem = () => setModalChapterItems((current) => [...current, ""]);

  const removeModalItem = (index: number) =>
    setModalChapterItems((current) => {
      if (current.length <= 1) {
        return [""];
      }

      return current.filter((_, itemIndex) => itemIndex !== index);
    });

  const removeChapter = (id: string) => {
    setPlanDraft((current) => current.filter((chapter) => chapter.id !== id));
  };

  const handleChapterSave = () => {
    const trimmedTitle = modalChapterTitle.trim();
    const sanitizedItems = modalChapterItems.map((item) => item.trim()).filter(Boolean);
    const itemsForDraft = sanitizedItems.length > 0 ? sanitizedItems : [""];
    const fallbackTitle = editingChapterId
      ? planDraft.find((chapter) => chapter.id === editingChapterId)?.chapter ?? ""
      : `Chapitre ${planDraft.length + 1}`;

    setPlanDraft((current) => {
      if (editingChapterId) {
        return current.map((chapter) =>
          chapter.id === editingChapterId
            ? {
                ...chapter,
                chapter: trimmedTitle || chapter.chapter || fallbackTitle,
                items: itemsForDraft,
              }
            : chapter,
        );
      }

      return [...current, { id: createPlanId(), chapter: trimmedTitle || fallbackTitle, items: itemsForDraft }];
    });

    closeChapterModal();
  };

  const openQuestionsEditor = (activity: TeacherCourseActivity) => setQuestionEditorActivity(activity);
  const closeQuestionsEditor = () => setQuestionEditorActivity(null);
  const openNotesModal = (activity: TeacherCourseActivity) => setNotesModalActivity(activity);
  const closeNotesModal = () => setNotesModalActivity(null);
  const openAddActivityModal = (category: TeacherCourseActivity["category"]) => {
    setActivityToAddCategory(category);
    setIsAddActivityModalOpen(true);
  };
  const closeAddActivityModal = () => setIsAddActivityModalOpen(false);

  return (
    <div className="space-y-6">
      <TeacherCourseBanner data={data} />

      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap gap-3">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={tabClassName(activeTab === tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === "descriptor" ? <TeacherDescriptorTab data={data} onOpenModal={setModalField} modalField={modalField} /> : null}
      {activeTab === "plan" ? (
        <TeacherPlanTab
          data={data}
          planDraft={planDraft}
          planPreview={planPreview}
          planViewMode={planViewMode}
          togglePlanViewMode={togglePlanViewMode}
          openChapterEditor={openChapterEditor}
          removeChapter={removeChapter}
          isChapterModalOpen={isChapterModalOpen}
          closeChapterModal={closeChapterModal}
          handleChapterSave={handleChapterSave}
          modalChapterTitle={modalChapterTitle}
          setModalChapterTitle={setModalChapterTitle}
          modalChapterItems={modalChapterItems}
          onModalItemChange={handleModalItemChange}
          addModalItem={addModalItem}
          removeModalItem={removeModalItem}
        />
      ) : null}
      {questionEditorActivity ? (
        <QuestionnaireEditor activity={questionEditorActivity} onClose={closeQuestionsEditor} />
      ) : (
        <>
          {activeTab === "qcm" ? (
            <TeacherActivitiesTab
              title="Banque QCM"
              activities={qcmActivities}
              category="qcm"
              onAddActivity={() => openAddActivityModal("qcm")}
              onManageQuestions={openQuestionsEditor}
              onViewNotes={openNotesModal}
            />
          ) : null}
          {activeTab === "tp" ? (
            <TeacherActivitiesTab
              title="Banque TP"
              activities={tpActivities}
              category="tp"
              onAddActivity={() => openAddActivityModal("tp")}
              onManageQuestions={openQuestionsEditor}
              onViewNotes={openNotesModal}
            />
          ) : null}
        </>
      )}
      <ActivityNotesModal activity={notesModalActivity} onClose={closeNotesModal} />
      <AddActivityModal
        isOpen={isAddActivityModalOpen}
        category={activityToAddCategory}
        courseId={data.cours.id}
        onClose={closeAddActivityModal}
      />
      <DescriptorFieldModals data={data} openField={modalField} onClose={() => setModalField(null)} />
    </div>
  );
}

function TeacherCourseBanner({ data }: { data: TeacherCoursePageDetails }) {
  return (
    <section className="overflow-hidden border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="bg-linear-to-r from-slate-950 via-slate-800 to-brand-600 px-5 py-7 sm:px-8 sm:py-10">
        <div className="max-w-4xl">
          <div className="text-xs font-medium uppercase tracking-[0.22em] text-white/70">Espace enseignant</div>
          <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">{data.matiere.designation || "Matiere"}</h1>
          <p className="mt-3 text-sm leading-6 text-white/80">
            {typeof data.courseDetails?.description === "string" && data.courseDetails.description.trim().length > 0
              ? data.courseDetails.description
              : "Consultez ici le descripteur du cours, son plan pédagogique et les activités QCM ou TP déjà configurées."}
          </p>
        </div>
      </div>

      <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 sm:px-8 sm:py-6 xl:grid-cols-4">
        <div className="border border-gray-200 bg-gray-50 px-4 py-4 text-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-gray-500 dark:text-gray-400">Promotion</div>
          <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{data.programme?.designation || "Non renseignée"}</div>
        </div>
        <div className="border border-gray-200 bg-gray-50 px-4 py-4 text-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-gray-500 dark:text-gray-400">Semestre</div>
          <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{data.semestre?.designation || "Non renseigné"}</div>
        </div>
        <div className="border border-gray-200 bg-gray-50 px-4 py-4 text-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-gray-500 dark:text-gray-400">Crédits</div>
          <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{data.matiere.credits ?? 0}</div>
        </div>
        <div className="border border-gray-200 bg-gray-50 px-4 py-4 text-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-gray-500 dark:text-gray-400">Canal</div>
          <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{data.cours.slug || "Non renseigné"}</div>
        </div>
        <div className="border border-gray-200 bg-gray-50 px-4 py-4 text-sm sm:col-span-2 xl:col-span-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="text-gray-500 dark:text-gray-400">Unité d&apos;enseignement</div>
          <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{data.unite?.designation || "Non renseignée"}</div>
        </div>
      </div>
    </section>
  );
}

const getStructuredObjective = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const general = typeof (value as Record<string, unknown>).general === "string" ? (value as Record<string, unknown>).general.trim() : null;
  const specificsArray = Array.isArray((value as Record<string, unknown>).speficique)
    ? (value as Record<string, unknown>).speficique
    : Array.isArray((value as Record<string, unknown>).specifique)
      ? (value as Record<string, unknown>).specifique
      : [];

  const specifics = specificsArray.filter((item): item is string => typeof item === "string" && item.trim().length > 0);

  if (!general && specifics.length === 0) {
    return null;
  }

  return { general, specifics };
};

const renderObjectiveValue = (value: unknown) => {
  const structured = getStructuredObjective(value);

  if (!structured) {
    return renderStructuredValue(value);
  }

  return (
    <div className="space-y-3">
      {structured.general ? (
        <div>
          <div className="text-xs uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500">Objectif général</div>
          <h4 className="text-base font-semibold text-gray-900 dark:text-white/90 whitespace-pre-line">{structured.general}</h4>
        </div>
      ) : null}
      {structured.specifics.length > 0 ? (
        <div>
          <div className="text-xs uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500">Objectifs spécifiques</div>
          <ul className="mt-2 space-y-2">
            {structured.specifics.map((item, index) => (
              <li
                key={`${item}-${index}`}
                className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                {item.trim()}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

const getMethodologiesValue = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const methodes = Array.isArray((value as Record<string, unknown>).methodes)
    ? (value as Record<string, unknown>).methodes
    : [];

  const parsed = methodes.filter((item): item is string => typeof item === "string" && item.trim().length > 0);

  return parsed.length > 0 ? parsed : null;
};

const renderMethodologiesValue = (value: unknown) => {
  const methods = getMethodologiesValue(value);

  if (!methods) {
    return renderStructuredValue(value);
  }

  return (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">Méthodes</div>
      <ul className="space-y-2">
        {methods.map((method, index) => (
          <li
            key={`${method}-${index}`}
            className="flex items-start gap-3 rounded-3xl border border-dashed border-brand-200 bg-brand-50/60 px-4 py-3 text-sm text-brand-900 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-200"
          >
            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-500"></span>
            <span className="whitespace-pre-line">{method.trim()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const getPenaltiesValue = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const penaltiesArray = Array.isArray((value as Record<string, unknown>).penalites)
    ? (value as Record<string, unknown>).penalites
    : [];

  const parsed = penaltiesArray
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const penalite = typeof record.penalite === "string" ? record.penalite.trim() : null;
      const sanction = typeof record.sanction === "string" ? record.sanction.trim() : null;

      if (!penalite && !sanction) {
        return null;
      }

      return { penalite, sanction };
    })
    .filter((item): item is { penalite: string | null; sanction: string | null } => Boolean(item && (item.penalite || item.sanction)));

  return parsed.length > 0 ? parsed : null;
};

const renderPenaltiesValue = (value: unknown) => {
  const penalties = getPenaltiesValue(value);

  if (!penalties) {
    return renderStructuredValue(value);
  }

  return (
    <div className="space-y-4">
      {penalties.map((penalty, index) => (
        <div
          key={`${penalty.penalite}-${index}`}
          className="rounded-3xl border border-gray-200 bg-white p-4 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <div className="text-xs uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">Pénalité</div>
          <p className="mt-1 text-base font-semibold leading-6 text-gray-900 dark:text-white/90">
            {penalty.penalite || "Pénalité non renseignée"}
          </p>
          {penalty.sanction ? (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{penalty.sanction}</p>
          ) : (
            <p className="mt-2 text-sm text-gray-500">Aucune sanction associée</p>
          )}
        </div>
      ))}
    </div>
  );
};

const getCompetencesValue = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const competencesArray = Array.isArray((value as Record<string, unknown>).competences)
    ? (value as Record<string, unknown>).competences
    : [];

  const parsed = competencesArray
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const competence = typeof record.competence === "string" ? record.competence.trim() : null;
      const description = typeof record.description === "string" ? record.description.trim() : null;

      if (!competence && !description) {
        return null;
      }

      return { competence, description };
    })
    .filter((item): item is { competence: string | null; description: string | null } => Boolean(item && (item.competence || item.description)));

  return parsed.length > 0 ? parsed : null;
};

const renderCompetencesValue = (value: unknown) => {
  const competences = getCompetencesValue(value);

  if (!competences) {
    return renderStructuredValue(value);
  }

  return (
    <div className="space-y-4">
      {competences.map((item, index) => (
        <div
          key={`${item.competence}-${index}`}
          className="rounded-3xl border border-dashed border-brand-200 bg-brand-50/60 p-4 dark:border-brand-500/40 dark:bg-brand-500/10"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs uppercase tracking-[0.4em] text-brand-500">Compétence</span>
            <span className="text-base font-semibold text-gray-900 dark:text-white/90">{item.competence || "Compétence non renseignée"}</span>
          </div>
          {item.description ? (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
          ) : (
            <p className="mt-2 text-sm text-gray-500"></p>
          )}
        </div>
      ))}
    </div>
  );
};

const getDisponibilitesValue = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const keys: Array<"frequence" | "periode" | "contact" | "bureau"> = ["frequence", "periode", "contact", "bureau"];
  const structured: Record<string, string> = {};

  for (const key of keys) {
    const text = typeof record[key] === "string" ? record[key].trim() : "";

    if (text) {
      structured[key] = text;
    }
  }

  return Object.keys(structured).length > 0 ? structured : null;
};

const renderDisponibilitesValue = (value: unknown) => {
  const disponibilites = getDisponibilitesValue(value);

  if (!disponibilites) {
    return renderStructuredValue(value);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Object.entries(disponibilites).map(([key, text]) => (
        <div key={key} className="rounded-3xl border border-gray-200 bg-white/60 p-4 text-sm text-gray-700 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-200">
          <div className="text-xs uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">{key.charAt(0).toUpperCase() + key.slice(1)}</div>
          <p className="font-semibold text-gray-900 dark:text-white/90">{text}</p>
        </div>
      ))}
    </div>
  );
};

function TeacherDescriptorTab({
  data,
  onOpenModal,
  modalField,
}: {
  data: TeacherCoursePageDetails;
  onOpenModal: (field: "description" | "objectifs" | "methodologies" | "penalites" | "competences" | "disponiblites") => void;
  modalField: null | "description" | "objectifs" | "methodologies" | "penalites" | "competences" | "disponiblites";
}) {
  const descriptorItems = [
    {
      id: "description",
      title: "Description",
      value: data.courseDetails?.description ?? data.cours.description ?? "Aucune description renseignée",
    },
    {
      id: "objectifs",
      title: "Objectifs",
      value: data.courseDetails?.objectifs ?? null,
    },
    {
      id: "methodologies",
      title: "Méthodologies",
      value: data.courseDetails?.methodologies ?? null,
    },
    {
      id: "penalites",
      title: "Pénalités",
      value: data.courseDetails?.penalites ?? null,
    },
    {
      id: "competences",
      title: "Compétences",
      value: data.courseDetails?.competences ?? null,
    },
    {
      id: "disponiblites",
      title: "Disponibilités",
      value: data.courseDetails?.disponiblites ?? null,
    },
  ];

  return (
    <section className="space-y-4">
      {descriptorItems.map((item) => (
        <details key={item.id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <summary className="flex cursor-pointer items-center justify-between gap-3 text-lg font-semibold text-gray-900 dark:text-white/90">
            {item.title}
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                onOpenModal(item.id as any);
              }}
              className="rounded-full border border-brand-500 px-3 py-1 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:border-brand-400 dark:text-brand-300 dark:hover:bg-brand-500/10"
            >
              Modifier
            </button>
          </summary>
          <div className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
            {item.id === "objectifs"
              ? renderObjectiveValue(item.value)
              : item.id === "methodologies"
                ? renderMethodologiesValue(item.value)
                : item.id === "penalites"
                  ? renderPenaltiesValue(item.value)
                  : item.id === "competences"
                    ? renderCompetencesValue(item.value)
                    : item.id === "disponiblites"
                      ? renderDisponibilitesValue(item.value)
                      : renderStructuredValue(item.value)}
          </div>
        </details>
      ))}
    </section>
  );
}

function StructuredField({ id, name, label, value }: { id: string; name: string; label: string; value: unknown }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <textarea id={id} name={name} rows={6} defaultValue={serializeEditableValue(value)} className={textareaClassName} />
    </div>
  );
}

function TeacherPlanTab({
  data,
  planDraft,
  planPreview,
  planViewMode,
  togglePlanViewMode,
  openChapterEditor,
  removeChapter,
  isChapterModalOpen,
  closeChapterModal,
  handleChapterSave,
  modalChapterTitle,
  setModalChapterTitle,
  modalChapterItems,
  onModalItemChange,
  addModalItem,
  removeModalItem,
}: {
  data: TeacherCoursePageDetails;
  planDraft: PlanDraftChapter[];
  planPreview: Array<{ chapter: string; items: string[] }>;
  planViewMode: "edit" | "read";
  togglePlanViewMode: () => void;
  openChapterEditor: (chapter?: PlanDraftChapter) => void;
  removeChapter: (id: string) => void;
  isChapterModalOpen: boolean;
  closeChapterModal: () => void;
  handleChapterSave: () => void;
  modalChapterTitle: string;
  setModalChapterTitle: (value: string) => void;
  modalChapterItems: string[];
  onModalItemChange: (index: number, value: string) => void;
  addModalItem: () => void;
  removeModalItem: (index: number) => void;
}) {
  return (
    <>
      <form action={saveTeacherCoursePlanAction} className="space-y-6">
        <input type="hidden" name="matiere_id" value={data.matiere.id} />
        <input type="hidden" name="course_id" value={data.cours.id} />
        <input type="hidden" name="plan" value={JSON.stringify(planPreview)} />

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium uppercase tracking-[0.2em] text-brand-500">Edition structuree</div>
              <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white/90">Plan du cours</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={togglePlanViewMode}
                className="inline-flex items-center justify-center rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
              >
                {planViewMode === "edit" ? "Basculer en mode lecture" : "Retour à l'édition"}
              </button>
              {planViewMode === "edit" ? (
                <button
                  type="button"
                  onClick={() => openChapterEditor()}
                  className="inline-flex items-center justify-center rounded-full border border-brand-300 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 dark:border-brand-500/40 dark:text-brand-300 dark:hover:bg-brand-500/10"
                >
                  + Ajouter un chapitre
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-6">
            {planViewMode === "read" ? (
              <PlanReadView chapters={planPreview} />
            ) : planDraft.length === 0 ? (
              <article className="rounded-3xl border border-dashed border-gray-300 bg-white/60 p-6 text-sm text-gray-500 shadow-theme-sm dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400">
                Ajoute au moins un chapitre pour commencer le plan du cours.
              </article>
            ) : (
              <div className="space-y-4">
                {planDraft.map((chapter, chapterIndex) => (
                  <PlanChapterCard
                    key={chapter.id}
                    chapter={chapter}
                    index={chapterIndex}
                    onEdit={() => openChapterEditor(chapter)}
                    onDelete={() => removeChapter(chapter.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {planViewMode === "edit" ? (
            <div className="mt-6 flex justify-end">
              <FormSubmitButton idleLabel="Enregistrer le plan" pendingLabel="Enregistrement..." />
            </div>
          ) : null}
        </section>
      </form>

      <Modal isOpen={isChapterModalOpen} onClose={closeChapterModal} className="m-4 max-w-3xl">
        <form
          className="space-y-6 rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900"
          onSubmit={(event) => {
            event.preventDefault();
            handleChapterSave();
          }}
        >
          <div>
            <Label htmlFor="chapter-title">Titre du chapitre</Label>
            <Input
              id="chapter-title"
              type="text"
              value={modalChapterTitle}
              onChange={(event) => setModalChapterTitle(event.target.value)}
              placeholder="Ex: Introduction à la matière"
            />
          </div>

          <div className="space-y-4">
            {modalChapterItems.map((item, index) => (
              <div key={`modal-item-${index}`} className="space-y-2">
                <Label htmlFor={`chapter-item-${index}`}>Élément {index + 1}</Label>
                <div className="flex gap-2">
                  <textarea
                    id={`chapter-item-${index}`}
                    rows={3}
                    value={item}
                    onChange={(event) => onModalItemChange(index, event.target.value)}
                    className={`${textareaClassName} flex-1`}
                    placeholder="Ajouter un point ou un objectif pour ce chapitre"
                  />
                  <button
                    type="button"
                    onClick={() => removeModalItem(index)}
                    className="mt-2 text-sm font-medium text-error-600 transition hover:text-error-700"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addModalItem()}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
            >
              Ajouter un élément
            </button>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeChapterModal}
              className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-500 transition hover:border-gray-400 dark:border-gray-600 dark:text-gray-300"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function PlanChapterCard({
  chapter,
  index,
  onEdit,
  onDelete,
}: {
  chapter: PlanDraftChapter;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const displayItems = chapter.items.map((item) => item.trim()).filter(Boolean);

  return (
    <article className="rounded-3xl border border-gray-200 bg-white/70 p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">Chapitre {index + 1}</div>
          <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white/90">
            {chapter.chapter || "Chapitre sans titre"}
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-gray-300 px-4 py-1 text-xs font-medium text-gray-600 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
          >
            Modifier
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full border border-error-200 px-4 py-1 text-xs font-medium text-error-600 transition hover:border-error-400 hover:text-error-700"
          >
            Supprimer
          </button>
        </div>
      </div>

      {displayItems.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {displayItems.map((item, itemIndex) => (
            <li
              key={`${item}-${itemIndex}`}
              className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Aucun élément structuré n'est encore défini.</p>
      )}
    </article>
  );
}

function PlanReadView({ chapters }: { chapters: Array<{ chapter: string; items: string[] }> }) {
  if (chapters.length === 0) {
    return (
      <article className="rounded-3xl border border-dashed border-gray-300 bg-white/60 p-6 text-sm text-gray-500 shadow-theme-sm dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400">
        Aucun chapitre n'est encore enregistré. Passe en mode édition pour ajouter des chapitres.
      </article>
    );
  }

  return (
    <div className="space-y-4">
      {chapters.map((chapter, index) => {
        const displayItems = chapter.items.filter((item) => item.trim().length > 0);

        return (
          <article
            key={`${chapter.chapter}-${index}`}
            className="rounded-3xl border border-gray-200 bg-white/80 px-5 py-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">Chapitre {index + 1}</div>
              <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white/90">
                {chapter.chapter || "Chapitre sans titre"}
              </h3>
            </div>
            {displayItems.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {displayItems.map((item, itemIndex) => (
                  <li
                    key={`${index}-${item}-${itemIndex}`}
                    className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Aucun contenu défini pour ce chapitre.</p>
            )}
          </article>
        );
      })}
    </div>
  );
}

function DescriptorFieldModals({
  data,
  openField,
  onClose,
}: {
  data: TeacherCoursePageDetails;
  openField: null | "description" | "objectifs" | "methodologies" | "penalites" | "competences" | "disponiblites";
  onClose: () => void;
}) {
  const [descriptionValue, setDescriptionValue] = useState("");
  const [objectifsGeneral, setObjectifsGeneral] = useState("");
  const [objectifsSpecifique, setObjectifsSpecifique] = useState("");
  const [methodologies, setMethodologies] = useState("");
  const [penalties, setPenalties] = useState<Array<{ penalite: string; sanction: string }>>([]);
  const [competences, setCompetences] = useState<Array<{ competence: string; description: string }>>([]);
  const [disponibilites, setDisponibilites] = useState({
    frequence: "",
    periode: "",
    contact: "",
    bureau: "",
  });

  useEffect(() => {
    setDescriptionValue(data.courseDetails?.description ?? data.cours.description ?? "");
    const objectifs = data.courseDetails?.objectifs ?? null;
    setObjectifsGeneral(typeof objectifs === "object" && objectifs?.general ? String(objectifs.general) : "");
    setObjectifsSpecifique(
      Array.isArray(objectifs?.speficique)
        ? objectifs.speficique.filter(Boolean).join("\n")
        : Array.isArray(objectifs?.specifique)
          ? objectifs.specifique.filter(Boolean).join("\n")
          : "",
    );
    const methodes = data.courseDetails?.methodologies?.methodes ?? data.courseDetails?.methodologies?.methodes ?? [];
    setMethodologies(Array.isArray(methodes) ? methodes.join("\n") : "");
    setPenalties(
      Array.isArray(data.courseDetails?.penalites?.penalites)
        ? data.courseDetails.penalites.penalites.map((item) => ({
            penalite: item.penalite ?? "",
            sanction: item.sanction ?? "",
          }))
        : [],
    );
    setCompetences(
      Array.isArray(data.courseDetails?.competences?.competences)
        ? data.courseDetails.competences.competences.map((item) => ({
            competence: item.competence ?? "",
            description: item.description ?? "",
          }))
        : [],
    );
    const dispo = data.courseDetails?.disponiblites ?? {};
    setDisponibilites({
      frequence: dispo.frequence ?? "",
      periode: dispo.periode ?? "",
      contact: dispo.contact ?? "",
      bureau: dispo.bureau ?? "",
    });
  }, [data]);

  const closeModal = () => {
    onClose();
  };

  if (!openField) {
    return null;
  }

  const commonHiddenFields = (
    <>
      <input type="hidden" name="matiere_id" value={data.matiere.id} />
      <input type="hidden" name="course_id" value={data.cours.id} />
    </>
  );

  return (
    <Modal isOpen={Boolean(openField)} onClose={closeModal} className="m-4 max-w-4xl">
      <div className="p-6">
        {openField === "description" ? (
          <form action={saveTeacherCourseDescriptorAction} className="space-y-4">
            {commonHiddenFields}
            <h3 className="text-xl font-semibold text-gray-900">Modifier la description</h3>
            <textarea
              name="description"
              rows={6}
              value={descriptionValue}
              onChange={(event) => setDescriptionValue(event.target.value)}
              className={textareaClassName}
            />
            <div className="flex justify-end gap-2">
              <FormSubmitButton idleLabel="Enregistrer" pendingLabel="Enregistrement..." />
              <button type="button" onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                Annuler
              </button>
            </div>
          </form>
        ) : openField === "objectifs" ? (
          <form action={saveTeacherCourseDescriptorAction} className="space-y-4">
            {commonHiddenFields}
            <input type="hidden" name="objectifs" value={JSON.stringify({ general: objectifsGeneral, speficique: objectifsSpecifique.split("\n").map((line) => line.trim()).filter(Boolean) })} />
            <h3 className="text-xl font-semibold text-gray-900">Objectifs</h3>
            <Label htmlFor="objectifs-general">Général</Label>
            <textarea id="objectifs-general" rows={4} value={objectifsGeneral} onChange={(event) => setObjectifsGeneral(event.target.value)} className={textareaClassName} />
            <Label htmlFor="objectifs-specific">Spécifiques (une ligne par item)</Label>
            <textarea
              id="objectifs-specific"
              rows={4}
              value={objectifsSpecifique}
              onChange={(event) => setObjectifsSpecifique(event.target.value)}
              className={textareaClassName}
            />
            <div className="flex justify-end gap-2">
              <FormSubmitButton idleLabel="Enregistrer" pendingLabel="Enregistrement..." />
              <button type="button" onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                Annuler
              </button>
            </div>
          </form>
        ) : openField === "methodologies" ? (
          <form action={saveTeacherCourseDescriptorAction} className="space-y-4">
            {commonHiddenFields}
            <input type="hidden" name="methodologies" value={JSON.stringify({ methodes: methodologies.split("\n").map((line) => line.trim()).filter(Boolean) })} />
            <h3 className="text-xl font-semibold text-gray-900">Méthodologies</h3>
            <Label htmlFor="methodologies">Médthodes (une par ligne)</Label>
            <textarea id="methodologies" rows={5} value={methodologies} onChange={(event) => setMethodologies(event.target.value)} className={textareaClassName} />
            <div className="flex justify-end gap-2">
              <FormSubmitButton idleLabel="Enregistrer" pendingLabel="Enregistrement..." />
              <button type="button" onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                Annuler
              </button>
            </div>
          </form>
        ) : openField === "penalites" ? (
          <form action={saveTeacherCourseDescriptorAction} className="space-y-4">
            {commonHiddenFields}
            <input
              type="hidden"
              name="penalites"
              value={JSON.stringify({ penalites: penalties.map((item) => ({ penalite: item.penalite, sanction: item.sanction })) })}
            />
            <h3 className="text-xl font-semibold text-gray-900">Pénalités</h3>
            <div className="space-y-3">
              {penalties.map((item, index) => (
                <div key={index} className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                  <Label htmlFor={`penalite-${index}`}>Pénalité</Label>
                  <input
                    id={`penalite-${index}`}
                    type="text"
                    value={item.penalite}
                    onChange={(event) => setPenalties((prev) => prev.map((entry, entryIndex) => (entryIndex === index ? { ...entry, penalite: event.target.value } : entry)))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <Label htmlFor={`sanction-${index}`} className="mt-2">
                    Sanction
                  </Label>
                  <input
                    id={`sanction-${index}`}
                    type="text"
                    value={item.sanction}
                    onChange={(event) => setPenalties((prev) => prev.map((entry, entryIndex) => (entryIndex === index ? { ...entry, sanction: event.target.value } : entry)))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setPenalties((prev) => [...prev, { penalite: "", sanction: "" }])}
                className="rounded-lg border border-brand-500 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
              >
                Ajouter une pénalité
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <FormSubmitButton idleLabel="Enregistrer" pendingLabel="Enregistrement..." />
              <button type="button" onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                Annuler
              </button>
            </div>
          </form>
        ) : openField === "competences" ? (
          <form action={saveTeacherCourseDescriptorAction} className="space-y-4">
            {commonHiddenFields}
            <input
              type="hidden"
              name="competences"
              value={JSON.stringify({ competences: competences.map((item) => ({ competence: item.competence, description: item.description })) })}
            />
            <h3 className="text-xl font-semibold text-gray-900">Compétences</h3>
            <div className="space-y-3">
              {competences.map((item, index) => (
                <div key={index} className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                  <Label htmlFor={`competence-${index}`}>Compétence</Label>
                  <input
                    id={`competence-${index}`}
                    type="text"
                    value={item.competence}
                    onChange={(event) =>
                      setCompetences((prev) => prev.map((entry, entryIndex) => (entryIndex === index ? { ...entry, competence: event.target.value } : entry)))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <Label htmlFor={`competence-desc-${index}`} className="mt-2">
                    Description
                  </Label>
                  <textarea
                    id={`competence-desc-${index}`}
                    rows={3}
                    value={item.description}
                    onChange={(event) =>
                      setCompetences((prev) => prev.map((entry, entryIndex) => (entryIndex === index ? { ...entry, description: event.target.value } : entry)))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setCompetences((prev) => [...prev, { competence: "", description: "" }])}
                className="rounded-lg border border-brand-500 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
              >
                Ajouter une compétence
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <FormSubmitButton idleLabel="Enregistrer" pendingLabel="Enregistrement..." />
              <button type="button" onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                Annuler
              </button>
            </div>
          </form>
        ) : openField === "disponiblites" ? (
          <form action={saveTeacherCourseDescriptorAction} className="space-y-4">
            {commonHiddenFields}
            <input
              type="hidden"
              name="disponiblites"
              value={JSON.stringify({
                frequence: disponibilites.frequence,
                periode: disponibilites.periode,
                contact: disponibilites.contact,
                bureau: disponibilites.bureau,
              })}
            />
            <h3 className="text-xl font-semibold text-gray-900">Disponibilités</h3>
            {["frequence", "periode", "contact", "bureau"].map((field) => (
              <div key={field}>
                <Label htmlFor={`disp-${field}`}>{field.charAt(0).toUpperCase() + field.slice(1)}</Label>
                <Input
                  id={`disp-${field}`}
                  name={field}
                  type="text"
                  value={(disponibilites as any)[field]}
                  onChange={(event) =>
                    setDisponibilites((prev) => ({ ...prev, [field]: event.target.value }))
                  }
                />
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <FormSubmitButton idleLabel="Enregistrer" pendingLabel="Enregistrement..." />
              <button type="button" onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                Annuler
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </Modal>
  );
}

function TeacherActivitiesTab({
  title,
  activities,
  category,
  onAddActivity,
  onManageQuestions,
  onViewNotes,
}: {
  title: string;
  activities: TeacherCourseActivity[];
  category: TeacherCourseActivity["category"];
  onAddActivity: (category: TeacherCourseActivity["category"]) => void;
  onManageQuestions: (activity: TeacherCourseActivity) => void;
  onViewNotes: (activity: TeacherCourseActivity) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium uppercase tracking-[0.2em] text-brand-500">Configuration enseignante</div>
          <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white/90">{title}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {activities.length} activité{activities.length > 1 ? "s" : ""} enregistrée{activities.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onAddActivity(category)}
            className="inline-flex items-center justify-center rounded-full border border-brand-300 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 dark:border-brand-500/40 dark:text-brand-300 dark:hover:bg-brand-500/10"
          >
            + Ajouter une épreuve
          </button>
        </div>
      </div>

      {activities.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {activities.map((activity) => (
            <TeacherActivityCard
              key={activity.id}
              activity={activity}
              onManageQuestions={onManageQuestions}
              onViewNotes={onViewNotes}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-5 py-10 text-sm text-gray-500 shadow-theme-sm dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400">
          Aucune activité de ce type n&apos;est encore rattachée au cours.
        </div>
      )}
    </section>
  );
}

const formatAmount = (value: number | null) =>
  typeof value === "number"
    ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(value)
    : "Montant non défini";

const formatDate = (value: string | null) => {
  if (!value) {
    return "Sans date limite";
  }

  try {
    return new Date(value).toLocaleDateString("fr-FR");
  } catch {
    return value;
  }
};

function TeacherActivityCard({
  activity,
  onManageQuestions,
  onViewNotes,
}: {
  activity: TeacherCourseActivity;
  onManageQuestions: (activity: TeacherCourseActivity) => void;
  onViewNotes: (activity: TeacherCourseActivity) => void;
}) {
  const questionCount = activity.questions.length;
  const notesCount = activity.notes.length;

  return (
    <article className="rounded-3xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="overflow-hidden rounded-t-3xl">
        <img
          src="/images/carousel/carousel-04.png"
          alt="Illustration de l'épreuve"
          className="h-52 w-full object-cover"
          width={384}
          height={208}
        />
      </div>
      <div className="space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500">{activity.category.toUpperCase()}</div>
            <h3 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white/90">
              {activity.designation || "Épreuve sans titre"}
            </h3>
          </div>
          <span className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-500 dark:border-brand-500/40 dark:text-brand-200">
            {notesCount} note{notesCount > 1 ? "s" : ""}
          </span>
        </div>
        <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
          {activity.description || "Aucune description fournie pour cette épreuve."}
        </p>

        <div className="grid gap-3 text-sm text-gray-500 dark:text-gray-400 sm:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">Montant</div>
            <p className="font-semibold text-gray-900 dark:text-white/90">{formatAmount(activity.montant)}</p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">Note max</div>
            <p className="font-semibold text-gray-900 dark:text-white/90">
              {typeof activity.note === "number" ? `${activity.note.toFixed(1)} pt(s)` : "Libre"}
            </p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">Date limite</div>
            <p className="font-semibold text-gray-900 dark:text-white/90">{formatDate(activity.date_limite)}</p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">Questions</div>
            <p className="font-semibold text-gray-900 dark:text-white/90">{questionCount} question{questionCount !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onManageQuestions(activity)}
            className="inline-flex items-center justify-center rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
          >
            Gérer le questionnaire
          </button>
          <button
            type="button"
            onClick={() => onViewNotes(activity)}
            className="inline-flex items-center justify-center rounded-full border border-brand-300 px-4 py-2 text-xs font-semibold text-brand-600 transition hover:bg-brand-50 dark:border-brand-500/40 dark:text-brand-300 dark:hover:bg-brand-500/10"
          >
            Voir les notes
          </button>
          <form action={exportActivityNotesAction}>
            <input type="hidden" name="activity_id" value={activity.id} />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
            >
              Exporter les notes
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}

function AddActivityModal({
  isOpen,
  category,
  courseId,
  onClose,
}: {
  isOpen: boolean;
  category: TeacherCourseActivity["category"];
  courseId: string;
  onClose: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-3xl">
      <form action={createTeacherActivityAction} className="space-y-5 rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <input type="hidden" name="course_id" value={courseId} />
        <input type="hidden" name="categorie" value={category} />
        <div>
          <div className="text-xs uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500">Catégorie</div>
          <p className="font-semibold text-gray-900 dark:text-white/90">{category.toUpperCase()}</p>
        </div>
        <div>
          <Label htmlFor="new-activity-designation">Désignation</Label>
          <Input id="new-activity-designation" name="designation" type="text" placeholder="Titre de l'épreuve" required />
        </div>
        <div>
          <Label htmlFor="new-activity-description">Description</Label>
          <textarea
            id="new-activity-description"
            name="description"
            rows={4}
            className={textareaClassName}
            placeholder="Décrivez brièvement l'épreuve (facultatif)"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="new-activity-montant">Montant (USD)</Label>
            <Input id="new-activity-montant" name="montant" type="number" step="0.01" placeholder="Ex: 5" />
          </div>
          <div>
            <Label htmlFor="new-activity-note">Note maximale</Label>
            <Input id="new-activity-note" name="note" type="number" step="0.5" placeholder="Ex: 20" />
          </div>
        </div>
        <div>
          <Label htmlFor="new-activity-date">Date limite</Label>
          <Input id="new-activity-date" name="date_limite" type="date" />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-500 transition hover:border-gray-400">
            Annuler
          </button>
          <button type="submit" className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600">
            Créer l'épreuve
          </button>
        </div>
      </form>
    </Modal>
  );
}

function QuestionnaireModal({ activity, onClose }: { activity: TeacherCourseActivity | null; onClose: () => void }) {
  const [questionRows, setQuestionRows] = useState<TeacherCourseQuestion[]>([]);

  useEffect(() => {
    setQuestionRows(activity?.questions ?? []);
  }, [activity]);

  const updateRow = (index: number, field: keyof TeacherCourseQuestion, value: string | number | undefined | string[]) => {
    setQuestionRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }

        return {
          ...row,
          [field]: value,
        };
      }),
    );
  };

  const addQuestion = () => {
    setQuestionRows((current) => [...current, { enonce: "", items: [], reponseIndex: undefined, pts: undefined }]);
  };

  const removeQuestion = (index: number) => {
    setQuestionRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = questionRows.map((row) => ({
      enonce: row.enonce,
      items: Array.isArray(row.items) ? row.items.filter(Boolean) : [],
      reponseIndex: typeof row.reponseIndex === "number" ? row.reponseIndex : undefined,
      pts: typeof row.pts === "number" ? row.pts : undefined,
      url: typeof row.url === "string" && row.url.trim() ? row.url.trim() : undefined,
    }));

    const form = event.currentTarget;
    const hiddenInput = document.createElement("input");
    hiddenInput.type = "hidden";
    hiddenInput.name = "questions";
    hiddenInput.value = JSON.stringify(payload);
    form.appendChild(hiddenInput);
    form.submit();
    hiddenInput.remove();
  };

  if (!activity) {
    return null;
  }

  return (
    <Modal isOpen onClose={onClose} className="m-4 max-w-5xl">
      <form
        action={saveTeacherActivityQuestionsAction}
        className="space-y-5 rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900"
        onSubmit={handleSubmit}
      >
        <input type="hidden" name="activity_id" value={activity.id} />
        <input type="hidden" name="tab" value={activity.category} />
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500">Épreuve</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white/90">{activity.designation || "Épreuve"}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-300">
            Fermer
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.3em] text-gray-400">
                <th className="px-3 py-2">Question</th>
                <th className="px-3 py-2">Items (une par ligne)</th>
                <th className="px-3 py-2">Index correct</th>
                <th className="px-3 py-2">Points</th>
                <th className="px-3 py-2">URL</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {questionRows.map((question, index) => (
                <tr key={`question-${index}`} className="align-top">
                  <td className="px-3 py-3">
                    <textarea
                      rows={2}
                      value={question.enonce}
                      onChange={(event) => updateRow(index, "enonce", event.target.value)}
                      className={`${textareaClassName} min-h-[64px]`}
                      placeholder="Enoncé de la question"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <textarea
                      rows={3}
                      value={(question.items ?? []).join("\n")}
                      onChange={(event) => updateRow(index, "items", event.target.value.split("\n"))}
                      className={`${textareaClassName} min-h-[80px]`}
                      placeholder="Une réponse par ligne"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      value={question.reponseIndex ?? ""}
                      onChange={(event) => updateRow(index, "reponseIndex", event.target.value ? Number(event.target.value) : undefined)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      value={question.pts ?? ""}
                      onChange={(event) => updateRow(index, "pts", event.target.value ? Number(event.target.value) : undefined)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Input
                      type="url"
                      value={question.url ?? ""}
                      onChange={(event) => updateRow(index, "url", event.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700"
                      placeholder="Lien facultatif"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      className="text-xs font-semibold text-error-600 hover:text-error-700"
                      onClick={() => removeQuestion(index)}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addQuestion}
            className="rounded-full border border-brand-300 px-4 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50"
          >
            + Ajouter une question
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Chaque ligne <em>items</em> correspond à une réponse, l’index commence à 0.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-500 transition hover:border-gray-400">
            Annuler
          </button>
          <button type="submit" className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600">
            Enregistrer les questions
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ActivityNotesModal({ activity, onClose }: { activity: TeacherCourseActivity | null; onClose: () => void }) {
  if (!activity) {
    return null;
  }

  return (
    <Modal isOpen onClose={onClose} className="m-4 max-w-4xl">
      <div className="space-y-5 rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500">Notes enregistrées</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white/90">{activity.designation || "Épreuve"}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-300">
            Fermer
          </button>
        </div>
        {activity.notes.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Aucune note n'a encore été enregistrée pour cette activité.</p>
        ) : (
          <div className="space-y-3">
            {activity.notes.map((note) => (
              <article key={note.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white/90">
                    {note.student?.nom || "Étudiant"} {note.student?.prenom || ""}
                  </p>
                  <span className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-500 dark:border-gray-600">{note.status || "En cours"}</span>
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">Note : {typeof note.note === "number" ? `${note.note}` : "Non renseignée"}</div>
                {note.comment ? (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Commentaire : {note.comment}</p>
                ) : null}
              </article>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <form action={exportActivityNotesAction}>
            <input type="hidden" name="activity_id" value={activity.id} />
            <button
              type="submit"
              className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
            >
              Exporter en CSV
            </button>
          </form>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-500 transition hover:border-gray-400"
          >
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  );
}

function QuestionnaireEditor({ activity, onClose }: { activity: TeacherCourseActivity | null; onClose: () => void }) {
  const [questionRows, setQuestionRows] = useState<TeacherCourseQuestion[]>([]);

  useEffect(() => {
    setQuestionRows(activity?.questions ?? []);
  }, [activity]);

  const updateRow = (index: number, field: keyof TeacherCourseQuestion, value: string | number | undefined | string[]) => {
    setQuestionRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }

        return {
          ...row,
          [field]: value,
        };
      }),
    );
  };

  const updateItem = (questionIndex: number, itemIndex: number, value: string) => {
    setQuestionRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== questionIndex) {
          return row;
        }

        const nextItems = [...(row.items ?? [])];
        nextItems[itemIndex] = value;

        return {
          ...row,
          items: nextItems,
        };
      }),
    );
  };

  const addItem = (questionIndex: number) => {
    setQuestionRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== questionIndex) {
          return row;
        }

        return {
          ...row,
          items: [...(row.items ?? []), ""],
        };
      }),
    );
  };

  const removeItem = (questionIndex: number, itemIndex: number) => {
    setQuestionRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== questionIndex) {
          return row;
        }

        const nextItems = [...(row.items ?? [])];
        nextItems.splice(itemIndex, 1);

        return {
          ...row,
          items: nextItems,
        };
      }),
    );
  };

  const addQuestion = () => {
    setQuestionRows((current) => [...current, { enonce: "", items: [""], reponseIndex: undefined, pts: undefined }]);
  };

  const removeQuestion = (index: number) => {
    setQuestionRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };

  if (!activity) {
    return null;
  }

  const serializedQuestions = useMemo(
    () =>
      JSON.stringify(
        questionRows.map((row) => ({
          enonce: row.enonce,
          items: Array.isArray(row.items) ? row.items.filter(Boolean) : [],
          reponseIndex: typeof row.reponseIndex === "number" ? row.reponseIndex : undefined,
          pts: typeof row.pts === "number" ? row.pts : undefined,
        })),
      ),
    [questionRows],
  );

  return (
    <section className="space-y-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <form action={saveTeacherActivityQuestionsAction} className="space-y-5">
        <input type="hidden" name="activity_id" value={activity.id} />
        <input type="hidden" name="tab" value={activity.category} />
        <input type="hidden" name="questions" value={serializedQuestions} />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500">Gestionnaire de questionnaire</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white/90">{activity.designation || "Épreuve"}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-300">
            Retour au cours
          </button>
        </div>
        <div className="space-y-6">
          {questionRows.map((question, index) => (
            <div key={`question-${index}`} className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/40">
              <Label className="text-xs uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">Énoncé #{index + 1}</Label>
              <textarea
                rows={3}
                value={question.enonce}
                onChange={(event) => updateRow(index, "enonce", event.target.value)}
                className={`${textareaClassName} w-full`}
                placeholder="Rédige l'énoncé complet de la question"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">Index correct</Label>
                  <Input
                    type="number"
                    value={question.reponseIndex ?? ""}
                    onChange={(event) => updateRow(index, "reponseIndex", event.target.value ? Number(event.target.value) : undefined)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">Points</Label>
                  <Input
                    type="number"
                    value={question.pts ?? ""}
                    onChange={(event) => updateRow(index, "pts", event.target.value ? Number(event.target.value) : undefined)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">Réponses possibles</div>
                {(question.items ?? []).map((item, itemIndex) => (
                  <div key={`item-${index}-${itemIndex}`} className="space-y-2">
                    <Input
                      type="text"
                      value={item}
                      onChange={(event) => updateItem(index, itemIndex, event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700"
                      placeholder={`Réponse ${itemIndex + 1}`}
                    />
                    <button
                      type="button"
                      className="text-xs font-semibold text-error-600 hover:text-error-700"
                      onClick={() => removeItem(index, itemIndex)}
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addItem(index)}
                  className="inline-flex w-full items-center justify-center rounded-full border border-brand-300 px-3 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                >
                  + Ajouter une réponse
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs font-semibold text-error-600 hover:text-error-700"
                  onClick={() => removeQuestion(index)}
                >
                  Supprimer la question
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addQuestion}
            className="rounded-full border border-brand-300 px-4 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50"
          >
            + Ajouter une question
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Chaque champ “ligne” correspond à une réponse possible; indiquez l’index correct à partir de 0.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-500 transition hover:border-gray-400">
            Retour au cours
          </button>
          <button type="submit" className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600">
            Enregistrer les questions
          </button>
        </div>
      </form>
    </section>
  );
}
