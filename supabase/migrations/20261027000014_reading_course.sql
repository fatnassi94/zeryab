-- Course «قراءة النوتة الموسيقية» (reading notes): rows for access and progress.
-- Lesson articles and drills are written in code (src/lib/courses/reading-notes.ts,
-- same slugs); the final test is stored here so it is graded on the server by
-- submit_exercise_attempt. Safe to run twice: existing rows are updated, the
-- test is created only once.

insert into public.courses (slug, title, summary, description, level, visibility, status, position)
values (
  'reading-notes',
  'قراءة النوتة الموسيقية',
  'من المدرج إلى قراءة لحن كامل مع المترونوم: تسعة دروس، عشرة تمارين، واختبار نهائي.',
  'مسار للمبتدئين: المدرج ومفتاح صول، أسماء النوتات، القيم والسكتات، الميزان، النقطة والربط، والعلامات العارضة مع نصف البيمول.',
  'beginner', 'public', 'published', 0
)
on conflict (slug) do update
  set title = excluded.title, summary = excluded.summary, description = excluded.description,
      level = excluded.level, visibility = excluded.visibility, status = excluded.status;

insert into public.lessons (course_id, slug, title, summary, level, position, status)
select c.id, v.slug, v.title, v.summary, 'beginner', v.position, 'published'
from public.courses c,
  (values
    ('staff-and-clef', 'المدرج ومفتاح صول', 'أين تُكتب النوتات، وكيف نعرف أن الصوت يصعد أو ينزل.', 1),
    ('note-names', 'أسماء النوتات على المدرج', 'دو ري مي فا صول لا سي: على أيّ خط أو فراغ تقع كل نوتة.', 2),
    ('ledger-lines', 'الخطوط الإضافية والأوكتاف', 'نوتات تحت المدرج وفوقه، ودو الوسطى.', 3),
    ('note-values', 'قيم النوتات والنبض', 'المستديرة والبيضاء والسوداء، والعدّ مع المترونوم.', 4),
    ('short-values-and-rests', 'الكروش والدوبل كروش والسكتات', 'أنصاف النبضة وأرباعها، وكيف نكتب الصمت.', 5),
    ('time-signatures', 'الميزان والمقاييس', 'الحواجز، والرقمان في أول السطر، والنبضة القوية.', 6),
    ('dots-and-ties', 'النقطة والربط', 'كيف نطيل النوتة: نصف قيمتها، أو بربطها بأخرى.', 7),
    ('accidentals', 'الدييز والبيمول ونصف البيمول', 'العلامات التي ترفع النوتة أو تخفضها، وأرباع الصوت في مقاماتنا.', 8),
    ('first-melody', 'قراءة لحن كامل', 'نجمع كل ما تعلّمناه: اقرأ لحنًا قصيرًا في مقام الراست مع المترونوم.', 9),
    ('drill-line-notes', 'تمرين ١: نوتات الخطوط', 'سمِّ النوتة المكتوبة على خطوط المدرج.', 10),
    ('drill-space-notes', 'تمرين ٢: نوتات الفراغات', 'سمِّ النوتة المكتوبة في الفراغات.', 11),
    ('drill-staff-notes', 'تمرين ٣: كل نوتات المدرج', 'خطوط وفراغات معًا، من دو إلى صول.', 12),
    ('drill-ledger-notes', 'تمرين ٤: الخطوط الإضافية', 'نوتات تحت المدرج وفوقه.', 13),
    ('drill-note-values', 'تمرين ٥: قيم النوتات', 'كم نبضة تدوم كل نوتة؟', 14),
    ('drill-rests', 'تمرين ٦: السكتات', 'كم يدوم الصمت؟', 15),
    ('drill-meter', 'تمرين ٧: الميزان والمقاييس', 'النبضات في المقياس وعدد المقاييس.', 16),
    ('drill-dots-ties', 'تمرين ٨: النقطة والربط', 'احسب مدّة النوتات المطوّلة.', 17),
    ('drill-accidentals', 'تمرين ٩: العلامات العارضة', 'دييز وبيمول ونصف بيمول.', 18),
    ('drill-ear', 'تمرين ١٠: اسمع واقرأ', 'استمع إلى لحن قصير واختر نوتته.', 19),
    ('final-test', 'الاختبار النهائي', 'خمسة عشر سؤالًا. النجاح من ٧٠٪ فما فوق.', 20)
  ) as v(slug, title, summary, position)
where c.slug = 'reading-notes'
on conflict (course_id, slug) do update
  set title = excluded.title, summary = excluded.summary, position = excluded.position, status = excluded.status;

-- Final test: [[…]] in a prompt is drawn as a staff (src/lib/courses/notation.ts).
do $$
declare
  v_lesson uuid;
  v_exercise uuid;
  v_question uuid;
  q record;
begin
  select l.id into v_lesson
  from public.lessons l join public.courses c on c.id = l.course_id
  where c.slug = 'reading-notes' and l.slug = 'final-test';

  if exists (select 1 from public.exercises where lesson_id = v_lesson) then
    return;
  end if;

  insert into public.exercises (lesson_id, kind, title, instructions, position, status)
  values (v_lesson, 'quiz', 'الاختبار النهائي: قراءة النوتة', 'أجب عن الأسئلة الخمسة عشر. النجاح من ١١ إجابة صحيحة.', 1, 'published')
  returning id into v_exercise;

  for q in
    select * from (values
      (1, 'ما اسم هذه النوتة؟ [[4/4 | G4:w]]', '["فا","صول","لا","مي"]', 1, 'على الخط الثاني، حيث يلتفّ مفتاح صول: صول.'),
      (2, 'ما اسم هذه النوتة؟ [[4/4 | B4:w]]', '["سي","ري","لا","دو"]', 0, 'الخط الثالث: سي.'),
      (3, 'ما اسم هذه النوتة؟ [[4/4 | F5:w]]', '["مي","صول","فا","ري"]', 2, 'الخط الخامس: فا.'),
      (4, 'ما اسم هذه النوتة؟ [[4/4 | A4:w]]', '["لا","سي","فا","صول"]', 0, 'الفراغ الثاني: لا.'),
      (5, 'ما اسم هذه النوتة؟ [[4/4 | E5:w]]', '["ري","مي","فا","دو"]', 1, 'الفراغ الرابع: مي.'),
      (6, 'ما اسم هذه النوتة؟ [[4/4 | C4:w]]', '["دو","ري","سي","لا"]', 0, 'على الخط الإضافي تحت المدرج: دو الوسطى.'),
      (7, 'ما اسم هذه النوتة؟ [[4/4 | A5:w]]', '["صول","لا","سي","فا"]', 1, 'على الخط الإضافي الأول فوق المدرج: لا.'),
      (8, 'كم نبضة تدوم كل نوتة هنا؟ [[4/4 | C5:h C5:h]]', '["نبضة واحدة","نبضتان","٣ نبضات","٤ نبضات"]', 1, 'البيضاء تدوم نبضتين.'),
      (9, 'كم كروش (ذات سنّ) في نبضة واحدة؟', '["واحدة","اثنتان","ثلاث","أربع"]', 1, 'الكروش نصف نبضة، فاثنتان تملآن نبضة.'),
      (10, 'كم نبضة يدوم الصمت في هذا المقياس؟ [[4/4 | C5:h r:h]]', '["نبضة واحدة","نبضتان","٣ نبضات","٤ نبضات"]', 1, 'سكتة البيضاء: نبضتان.'),
      (11, 'ماذا يعني الرقم العلوي في الميزان ٣/٤؟', '["عدد المقاييس","عدد النبضات في كل مقياس","سرعة اللحن","قيمة النبضة"]', 1, 'العلوي عدد النبضات في المقياس، والسفلي قيمة النبضة.'),
      (12, 'كم نبضة تدوم البيضاء بنقطة؟ [[3/4 | C5:h.]]', '["نبضتان","نبضتان ونصف","٣ نبضات","٤ نبضات"]', 2, 'النقطة تزيد نصف القيمة: ٢ + ١ = ٣.'),
      (13, 'كم نبضة تدوم النوتة الأولى مع ربطها؟ [[4/4 | A4:h~ A4:q A4:q]]', '["نبضتان","٣ نبضات","٤ نبضات","نبضة ونصف"]', 1, 'نبضتان + نبضة = ٣ نبضات، تُغنّى دون إعادة.'),
      (14, 'ما اسم هذه النوتة؟ [[4/4 | Ed4:w]]', '["مي بيمول","مي نصف بيمول","مي دييز","مي"]', 1, 'نصف البيمول يخفض مي ربع درجة: صوت مقام الراست.'),
      (15, 'ماذا يفعل الدييز ♯؟', '["يخفض النوتة نصف درجة","يرفع النوتة نصف درجة","يلغي العلامة","يطيل النوتة"]', 1, 'الدييز يرفع النوتة نصف درجة.')
    ) as t(position, prompt, options, answer, explanation)
  loop
    insert into public.exercise_questions (exercise_id, prompt, options, points, position)
    values (v_exercise, q.prompt, q.options::jsonb, 1, q.position)
    returning id into v_question;
    insert into public.exercise_answer_keys (question_id, correct_option, explanation)
    values (v_question, q.answer, q.explanation);
  end loop;
end $$;
