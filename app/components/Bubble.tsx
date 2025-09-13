type BubbleProps = {
    message: { content: React.ReactNode; role: string };
  };
  
  const Bubble = ({ message }: BubbleProps) => {
    const { content, role } = message;
    return <div className={`${role} bubble`}>{content}</div>;
  };
  
  export default Bubble;
  