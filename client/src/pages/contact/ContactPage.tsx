import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { IoLogoWhatsapp } from "react-icons/io5";
import { Button, Container, Input, Section, Select, Textarea, toast } from "@/components/ui";
import { catalogApi } from "@/features/catalog/catalog.api";
import { PageHero } from "@/features/catalog/PageHero/PageHero";
import { useLocations } from "@/features/catalog/useCatalog";
import { errorMessage } from "@/services/http";
import { waHref } from "@/utils/format";
import styles from "./ContactPage.module.css";

const schema = z.object({
  name: z.string().trim().min(2, "Ingresá tu nombre"),
  email: z.string().trim().email("Email inválido"),
  phone: z.string().optional(),
  location: z.string().optional(),
  message: z.string().trim().min(10, "Contanos un poco más (mínimo 10 caracteres)"),
});
type Form = z.infer<typeof schema>;

export default function ContactPage() {
  const { data: locations } = useLocations();
  const form = useForm<Form>({ resolver: zodResolver(schema) });
  const send = useMutation({
    mutationFn: (f: Form) => catalogApi.contact({ ...f, location: f.location || undefined }),
    onSuccess: () => {
      toast.success("¡Gracias! Te respondemos a la brevedad.");
      form.reset();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <>
      <title>Contacto · Jack el Barbero</title>
      <PageHero eyebrow="Contacto" title="Hablemos" text="Eventos, empresas, prensa o lo que necesites." image="/images/contact/contacto-hero.webp" />
      <Section>
        <Container className={styles.grid}>
          <form onSubmit={form.handleSubmit((f) => send.mutate(f))} className={styles.form} noValidate>
            <Input label="Nombre" {...form.register("name")} error={form.formState.errors.name?.message} />
            <Input label="Email" type="email" {...form.register("email")} error={form.formState.errors.email?.message} />
            <Input label="Teléfono (opcional)" type="tel" {...form.register("phone")} />
            <Select label="Sede (opcional)" placeholder="Cualquiera" options={(locations ?? []).map((l) => ({ value: l._id, label: l.name }))} {...form.register("location")} />
            <Textarea label="Mensaje" rows={6} {...form.register("message")} error={form.formState.errors.message?.message} />
            <Button type="submit" size="lg" loading={send.isPending}>Enviar mensaje</Button>
          </form>
          <aside className={styles.side}>
            <h2>¿Es por un turno?</h2>
            <p>Lo más rápido es reservar online o escribirle directo a la sede por WhatsApp.</p>
            {locations?.map((l) => (
              <a key={l._id} href={waHref(l.whatsapp)} target="_blank" rel="noopener noreferrer" className={styles.wa}>
                <IoLogoWhatsapp size={22} />
                <span><strong>{l.name}</strong>{l.address}</span>
              </a>
            ))}
          </aside>
        </Container>
      </Section>
    </>
  );
}
