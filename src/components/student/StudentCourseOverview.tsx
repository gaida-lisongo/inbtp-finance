"use client";

import { useMemo, useState } from "react";

import StudentCourseActivitiesSection from "@/components/student/course/StudentCourseActivitiesSection";
import StudentCourseBanner from "@/components/student/course/StudentCourseBanner";
import StudentCourseDetailsSection from "@/components/student/course/StudentCourseDetailsSection";
import StudentCoursePlanCarousel from "@/components/student/course/StudentCoursePlanCarousel";
import { parsePlanChapters } from "@/components/student/course/course-overview-shared";
import ActivityCheckoutFlow from "@/components/student/ActivityCheckoutFlow";
import { Modal } from "@/components/ui/modal";
import type { StudentCoursePageDetails } from "@/lib/utils/supabase/student-course";

type StudentCourseOverviewProps = {
  data: StudentCoursePageDetails;
};

export default function StudentCourseOverview({ data }: StudentCourseOverviewProps) {
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  const selectedActivity = useMemo(
    () => data.activities.find((activity) => activity.id === selectedActivityId) ?? null,
    [data.activities, selectedActivityId],
  );

  const sections = [
    { key: "objectifs", value: data.cours.objectifs },
    { key: "competences", value: data.cours.competences },
    { key: "methodologies", value: data.cours.methodologies },
    { key: "penalites", value: data.cours.penalites },
    { key: "disponibilites", value: data.cours.disponibilites },
  ].filter((section) => Boolean(section.value));
  const planChapters = parsePlanChapters(data.cours.plan);

  return (
    <>
      <div className="space-y-6">
        <StudentCourseBanner data={data} />
        <StudentCourseActivitiesSection activities={data.activities} onSelectActivity={setSelectedActivityId} />
        <StudentCoursePlanCarousel chapters={planChapters} />
        <StudentCourseDetailsSection sections={sections} />
      </div>

      <Modal
        isOpen={selectedActivity !== null}
        onClose={() => setSelectedActivityId(null)}
        className="m-4 max-w-[760px]"
      >
        <div className="p-6 sm:p-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white/90">
            {selectedActivity?.designation || "Commander l'activité"}
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Lancez la commande de cette activité depuis la page du cours.
          </p>

          {selectedActivity ? (
            <div className="mt-6">
              <ActivityCheckoutFlow
                activity={selectedActivity}
                student={data.student}
                onSuccess={(orderNumber) => {
                  window.location.href = `/commande/validate/${orderNumber}`;
                }}
              />
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
