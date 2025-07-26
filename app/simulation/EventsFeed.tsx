const EventsFeed = ({ companyId, autoRefresh }: Props) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/events?companyId=${companyId}`);
        if (response.ok) {
          const data = await response.json();
          setEvents(data);
        } else {
          setError('Failed to load events');
        }
      } catch (err) {
        setError('Error loading events');
      } finally {
        setLoading(false);
      }
    };

    loadEvents();

    if (autoRefresh) {
      const intervalId = setInterval(loadEvents, 5000);
      return () => clearInterval(intervalId);
    }
  }, [companyId, autoRefresh]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      {events.map((event) => (
        <div key={event.id}>
          {/* 确保正确解析和展示决策信息 */}
          <Badge>{event.type}</Badge>
          <p>{event.description}</p>
          {/* 删除: <p>{event.companyName}</p> */}
          {/* 确保展示正确的员工或决策信息 */}
          <p>{event.employeeName || event.decisionContent}</p>
        </div>
      ))}
    </div>
  );
};

